import type { DbConn, SqlValue } from "@shared/db"
import { INSERT_CHUNK, valuePlaceholders } from "@shared/db"
import {
  emptyToUndef,
  parseJson,
  toBigInt,
  toNumber,
  type IngestProviderName,
} from "@shared/helpers"
import { sqlExpr as severitySql } from "../helpers/severity"
import type {
  FacetValue,
  LogFacets,
  LogListFilters,
  LogRecord,
  LogSortField,
  LogSortOrder,
} from "../types/log"

function mapRow(row: Record<string, unknown>): LogRecord {
  return {
    id: String(row.id),
    timeNs: toBigInt(row.time_ns),
    observedTimeNs:
      row.observed_time_ns == null || row.observed_time_ns === ""
        ? undefined
        : toBigInt(row.observed_time_ns),
    severityNumber:
      row.severity_number == null || row.severity_number === ""
        ? undefined
        : toNumber(row.severity_number),
    severityText: emptyToUndef(row.severity_text as string | null),
    bodyAny: parseJson(row.body_any) ?? undefined,
    eventName: emptyToUndef(row.event_name as string | null),
    serviceName: String(row.service_name ?? ""),
    resourceAttributes: parseJson(row.resource_attributes) ?? null,
    resourceDroppedAttributesCount: toNumber(row.resource_dropped_attributes_count),
    resourceSchemaUrl: emptyToUndef(row.resource_schema_url as string | null),
    scopeName: emptyToUndef(row.scope_name as string | null),
    scopeVersion: emptyToUndef(row.scope_version as string | null),
    scopeAttributes: parseJson(row.scope_attributes) ?? null,
    scopeDroppedAttributesCount: toNumber(row.scope_dropped_attributes_count),
    scopeSchemaUrl: emptyToUndef(row.scope_schema_url as string | null),
    attributes: parseJson(row.attributes) ?? null,
    droppedAttributesCount: toNumber(row.dropped_attributes_count),
    flags: toNumber(row.flags),
    traceId: emptyToUndef(row.trace_id as string | null),
    spanId: emptyToUndef(row.span_id as string | null),
    ingestProvider: (row.ingest_provider as IngestProviderName) ?? "otlp",
  }
}

const LOG_SELECT = `SELECT id, time_ns, observed_time_ns, severity_number, severity_text,
            body_any, event_name, service_name, resource_attributes,
            resource_dropped_attributes_count, resource_schema_url,
            scope_name, scope_version, scope_attributes,
            scope_dropped_attributes_count, scope_schema_url,
            attributes, dropped_attributes_count, flags,
            trace_id, span_id, ingest_provider
     FROM logs`

const SORT_SQL: Record<LogSortField, string> = {
  date: "time_ns",
  service: "service_name COLLATE NOCASE",
  severity: "COALESCE(severity_number, 0)",
}

const ORDER_SQL: Record<LogSortOrder, string> = {
  asc: "ASC",
  desc: "DESC",
}

function orderBy(filters: LogListFilters): string {
  const col = SORT_SQL[filters.sort]
  const dir = ORDER_SQL[filters.order]
  if (filters.sort === "date") {
    return `ORDER BY ${col} ${dir} LIMIT ? OFFSET ?`
  }
  return `ORDER BY ${col} ${dir}, time_ns DESC LIMIT ? OFFSET ?`
}

function likeContains(value: string): string {
  return `%${value.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`
}

export async function forTrace(
  conn: DbConn,
  traceId: string,
): Promise<LogRecord[]> {
  const rows = await conn.all(
    `${LOG_SELECT}
     WHERE trace_id = ?
     ORDER BY time_ns ASC`,
    [traceId],
  )
  return rows.map((row) => mapRow(row))
}

export async function list(
  conn: DbConn,
  filters: LogListFilters,
): Promise<LogRecord[]> {
  const conditions: string[] = []
  const params: SqlValue[] = []

  if (filters.service) {
    conditions.push("service_name = ?")
    params.push(filters.service)
  }
  if (filters.severity) {
    conditions.push(`${severitySql} = ?`)
    params.push(filters.severity)
  }
  if (filters.message) {
    conditions.push(
      "LOWER(COALESCE(body_any, '')) LIKE LOWER(?) ESCAPE '\\'",
    )
    params.push(likeContains(filters.message))
  }
  if (filters.traceId) {
    conditions.push(
      "LOWER(COALESCE(trace_id, '')) LIKE LOWER(?) ESCAPE '\\'",
    )
    params.push(likeContains(filters.traceId))
  }
  if (filters.sinceNs != null) {
    conditions.push("time_ns >= ?")
    params.push(filters.sinceNs)
  }
  if (filters.untilNs != null) {
    conditions.push("time_ns <= ?")
    params.push(filters.untilNs)
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""
  params.push(filters.limit, filters.offset)
  const rows = await conn.all(
    `${LOG_SELECT}${where} ${orderBy(filters)}`,
    params,
  )
  return rows.map((row) => mapRow(row))
}

export async function count(
  conn: DbConn,
  filters: LogListFilters,
): Promise<number> {
  const conditions: string[] = []
  const params: SqlValue[] = []

  if (filters.service) {
    conditions.push("service_name = ?")
    params.push(filters.service)
  }
  if (filters.severity) {
    conditions.push(`${severitySql} = ?`)
    params.push(filters.severity)
  }
  if (filters.message) {
    conditions.push(
      "LOWER(COALESCE(body_any, '')) LIKE LOWER(?) ESCAPE '\\'",
    )
    params.push(likeContains(filters.message))
  }
  if (filters.traceId) {
    conditions.push(
      "LOWER(COALESCE(trace_id, '')) LIKE LOWER(?) ESCAPE '\\'",
    )
    params.push(likeContains(filters.traceId))
  }
  if (filters.sinceNs != null) {
    conditions.push("time_ns >= ?")
    params.push(filters.sinceNs)
  }
  if (filters.untilNs != null) {
    conditions.push("time_ns <= ?")
    params.push(filters.untilNs)
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""
  const counted = await conn.all(`SELECT count(*) AS n FROM logs${where}`, params)
  return toNumber(counted[0]?.n)
}

async function counted(conn: DbConn, sql: string): Promise<FacetValue[]> {
  const rows = await conn.all(sql)
  return rows.map((row) => ({
    value: String(row.value),
    count: toNumber(row.n),
  }))
}

export async function facets(conn: DbConn): Promise<LogFacets> {
  const services = await counted(
    conn,
    `SELECT COALESCE(NULLIF(service_name, ''), 'unknown_service') AS value, count(*) AS n
     FROM logs
     GROUP BY value
     ORDER BY n DESC, value`,
  )
  const severities = await counted(
    conn,
    `SELECT ${severitySql} AS value, count(*) AS n
     FROM logs
     GROUP BY value
     ORDER BY n DESC, value`,
  )
  return { services, severities }
}

const LOG_COLUMNS = 22

function logValues(log: LogRecord): SqlValue[] {
  return [
    log.id,
    log.timeNs,
    log.observedTimeNs ?? null,
    log.severityNumber ?? null,
    log.severityText ?? "",
    log.bodyAny == null ? "" : JSON.stringify(log.bodyAny),
    log.eventName ?? "",
    log.serviceName,
    JSON.stringify(log.resourceAttributes ?? null),
    log.resourceDroppedAttributesCount,
    log.resourceSchemaUrl ?? "",
    log.scopeName ?? "",
    log.scopeVersion ?? "",
    JSON.stringify(log.scopeAttributes ?? null),
    log.scopeDroppedAttributesCount,
    log.scopeSchemaUrl ?? "",
    JSON.stringify(log.attributes ?? null),
    log.droppedAttributesCount,
    log.flags,
    log.traceId ?? "",
    log.spanId ?? "",
    log.ingestProvider ?? "otlp",
  ]
}

export async function bulkCreate(
  conn: DbConn,
  logs: LogRecord[],
): Promise<void> {
  if (logs.length === 0) return
  for (let i = 0; i < logs.length; i += INSERT_CHUNK) {
    const chunk = logs.slice(i, i + INSERT_CHUNK)
    await conn.run(
      `INSERT INTO logs (
                        id, time_ns, observed_time_ns, severity_number, severity_text,
                        body_any, event_name, service_name, resource_attributes,
                        resource_dropped_attributes_count, resource_schema_url,
                        scope_name, scope_version, scope_attributes, scope_dropped_attributes_count,
                        scope_schema_url, attributes, dropped_attributes_count, flags,
                        trace_id, span_id, ingest_provider
                    ) VALUES ${valuePlaceholders(chunk.length, LOG_COLUMNS)}`,
      chunk.flatMap(logValues),
    )
  }
}
