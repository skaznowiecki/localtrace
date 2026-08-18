import type { DbConn, SqlValue } from "../../../shared/db"
import { INSERT_CHUNK, valuePlaceholders } from "../../../shared/db"
import { emptyToUndef, parseJson, toBigInt, toNumber } from "../../../shared/helpers"
import type { LogRecord } from "../types/log"

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
  }
}

export async function forTrace(
  conn: DbConn,
  traceId: string,
): Promise<LogRecord[]> {
  const rows = await conn.all(
    `SELECT id, time_ns, observed_time_ns, severity_number, severity_text,
            body_any, event_name, service_name, resource_attributes,
            resource_dropped_attributes_count, resource_schema_url,
            scope_name, scope_version, scope_attributes,
            scope_dropped_attributes_count, scope_schema_url,
            attributes, dropped_attributes_count, flags,
            trace_id, span_id
     FROM logs
     WHERE trace_id = ?
     ORDER BY time_ns ASC`,
    [traceId],
  )
  return rows.map((row) => mapRow(row))
}

const LOG_COLUMNS = 21

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
                        trace_id, span_id
                    ) VALUES ${valuePlaceholders(chunk.length, LOG_COLUMNS)}`,
      chunk.flatMap(logValues),
    )
  }
}
