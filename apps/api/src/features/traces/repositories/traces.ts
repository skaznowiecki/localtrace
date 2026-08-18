import type { DbConn, SqlValue } from "../../../shared/db"
import {
  INSERT_CHUNK,
  valuePlaceholders,
} from "../../../shared/db"
import { emptyToUndef, parseJson, toBigInt, toNumber } from "../../../shared/helpers"
import type { Json } from "../../../shared/helpers"
import type {
  SpanRecord,
  TraceFacets,
  TraceListFilters,
  TraceSummary,
} from "../types/span"

export type RebuildRow = {
  traceId: string
  startTimeNs: bigint
  endTimeNs: bigint
  durationNs: bigint
  spanCount: number
  rootObserved: boolean
  rootSpanId?: string
  rootService?: string
  rootName?: string
  rootStatusCode: number
  rootAttributes: Json
}

const TRACE_SELECT = `SELECT trace_id, root_span_id, root_observed, root_service, root_name,
        start_time_ns, end_time_ns, duration_ns, status_code, span_count,
        http_method, http_status_code, http_url, http_route
 FROM traces`

const SPAN_SELECT = `SELECT trace_id, span_id, parent_span_id, name, kind,
        start_time_ns, end_time_ns, duration_ns, status_code, status_message,
        trace_state, flags, dropped_attributes_count, dropped_events_count,
        dropped_links_count, service_name, resource_attributes,
        resource_dropped_attributes_count, resource_schema_url,
        scope_name, scope_version, scope_attributes, scope_dropped_attributes_count,
        scope_schema_url, attributes, events, links
 FROM spans`

function mapTrace(row: Record<string, unknown>): TraceSummary {
  const statusRaw = String(row.status_code ?? "ok")
  return {
    traceId: String(row.trace_id),
    rootSpanId: emptyToUndef(row.root_span_id as string | null),
    rootObserved: Boolean(row.root_observed),
    rootService: emptyToUndef(row.root_service as string | null),
    rootName: emptyToUndef(row.root_name as string | null),
    startTimeNs: toBigInt(row.start_time_ns),
    endTimeNs: toBigInt(row.end_time_ns),
    durationNs: toBigInt(row.duration_ns),
    status: statusRaw === "error" ? "error" : "ok",
    spanCount: toNumber(row.span_count),
    httpMethod: emptyToUndef(row.http_method as string | null),
    httpStatusCode:
      row.http_status_code == null ? undefined : toNumber(row.http_status_code),
    httpUrl: emptyToUndef(row.http_url as string | null),
    httpRoute: emptyToUndef(row.http_route as string | null),
  }
}

function mapSpan(row: Record<string, unknown>): SpanRecord {
  return {
    traceId: String(row.trace_id),
    spanId: String(row.span_id),
    parentSpanId: emptyToUndef(row.parent_span_id as string | null),
    name: String(row.name ?? ""),
    kind: toNumber(row.kind),
    startTimeNs: toBigInt(row.start_time_ns),
    endTimeNs: toBigInt(row.end_time_ns),
    durationNs: toBigInt(row.duration_ns),
    statusCode: toNumber(row.status_code),
    statusMessage: emptyToUndef(row.status_message as string | null),
    traceState: emptyToUndef(row.trace_state as string | null),
    flags: toNumber(row.flags),
    droppedAttributesCount: toNumber(row.dropped_attributes_count),
    droppedEventsCount: toNumber(row.dropped_events_count),
    droppedLinksCount: toNumber(row.dropped_links_count),
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
    events: parseJson(row.events) ?? null,
    links: parseJson(row.links) ?? null,
  }
}

export async function list(
  conn: DbConn,
  filters: TraceListFilters,
): Promise<TraceSummary[]> {
  const conditions: string[] = []
  const params: SqlValue[] = []

  if (filters.service) {
    conditions.push("root_service = ?")
    params.push(filters.service)
  }
  if (filters.status) {
    conditions.push("status_code = ?")
    params.push(filters.status)
  }
  if (filters.method) {
    conditions.push("upper(http_method) = upper(?)")
    params.push(filters.method)
  }
  if (filters.httpStatusCode != null) {
    conditions.push("http_status_code = ?")
    params.push(filters.httpStatusCode)
  }
  if (filters.name) {
    conditions.push("root_name LIKE '%' || ? || '%' COLLATE NOCASE")
    params.push(filters.name)
  }
  if (filters.url) {
    conditions.push("http_route = ?")
    params.push(filters.url)
  }
  if (filters.durationMinNs != null) {
    conditions.push("duration_ns >= ?")
    params.push(filters.durationMinNs)
  }
  if (filters.durationMaxNs != null) {
    conditions.push("duration_ns <= ?")
    params.push(filters.durationMaxNs)
  }
  if (filters.sinceNs != null) {
    conditions.push("start_time_ns >= ?")
    params.push(filters.sinceNs)
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""
  params.push(filters.limit)
  const rows = await conn.all(
    `${TRACE_SELECT}${where} ORDER BY start_time_ns DESC LIMIT ?`,
    params,
  )
  return rows.map((row) => mapTrace(row))
}

export async function facets(conn: DbConn): Promise<TraceFacets> {
  const services = await distinctStrings(
    conn,
    `SELECT DISTINCT COALESCE(root_service, 'unknown_service') AS value
     FROM traces ORDER BY value`,
  )
  const methods = await distinctStrings(
    conn,
    `SELECT DISTINCT http_method AS value
     FROM traces
     WHERE http_method IS NOT NULL AND http_method <> ''
     ORDER BY value`,
  )
  const codesRows = await conn.all(
    `SELECT DISTINCT http_status_code AS value
     FROM traces
     WHERE http_status_code IS NOT NULL
     ORDER BY value`,
  )
  const httpStatusCodes = codesRows.map((row) => toNumber(row.value))

  const routesRows = await conn.all(
    `SELECT http_route AS value, count(*) AS n
     FROM traces
     WHERE http_route IS NOT NULL AND http_route <> ''
     GROUP BY http_route
     ORDER BY n DESC, value`,
  )
  const routes = routesRows.map((row) => ({
    value: String(row.value),
    count: toNumber(row.n),
  }))

  return {
    services,
    statuses: ["ok", "error"],
    methods,
    httpStatusCodes,
    routes,
  }
}

export async function get(
  conn: DbConn,
  traceId: string,
): Promise<{ trace: TraceSummary; spans: SpanRecord[] } | undefined> {
  const traceRows = await conn.all(`${TRACE_SELECT} WHERE trace_id = ?`, [
    traceId,
  ])
  const traceRow = traceRows[0]
  if (!traceRow) return undefined

  const spans = await listSpans(conn, traceId)
  return { trace: mapTrace(traceRow), spans }
}

async function listSpans(
  conn: DbConn,
  traceId: string,
): Promise<SpanRecord[]> {
  const rows = await conn.all(
    `${SPAN_SELECT} WHERE trace_id = ? ORDER BY start_time_ns ASC`,
    [traceId],
  )
  return rows.map((row) => mapSpan(row))
}

const SPAN_COLUMNS = 27
const TRACE_COLUMNS = 14

function spanValues(span: SpanRecord): SqlValue[] {
  return [
    span.traceId,
    span.spanId,
    span.parentSpanId ?? "",
    span.name,
    span.kind,
    span.startTimeNs,
    span.endTimeNs,
    span.durationNs,
    span.statusCode,
    span.statusMessage ?? "",
    span.traceState ?? "",
    span.flags,
    span.droppedAttributesCount,
    span.droppedEventsCount,
    span.droppedLinksCount,
    span.serviceName,
    JSON.stringify(span.resourceAttributes ?? null),
    span.resourceDroppedAttributesCount,
    span.resourceSchemaUrl ?? "",
    span.scopeName ?? "",
    span.scopeVersion ?? "",
    JSON.stringify(span.scopeAttributes ?? null),
    span.scopeDroppedAttributesCount,
    span.scopeSchemaUrl ?? "",
    JSON.stringify(span.attributes ?? null),
    JSON.stringify(span.events ?? null),
    JSON.stringify(span.links ?? null),
  ]
}

function summaryValues(summary: TraceSummary): SqlValue[] {
  return [
    summary.traceId,
    summary.rootSpanId ?? null,
    summary.rootObserved,
    summary.rootService ?? null,
    summary.rootName ?? null,
    summary.startTimeNs,
    summary.endTimeNs,
    summary.durationNs,
    summary.status,
    summary.spanCount,
    summary.httpMethod ?? null,
    summary.httpStatusCode ?? null,
    summary.httpUrl ?? null,
    summary.httpRoute ?? null,
  ]
}

export async function upsertSpans(
  conn: DbConn,
  spans: SpanRecord[],
): Promise<void> {
  if (spans.length === 0) return

  const conflict = `ON CONFLICT (trace_id, span_id) DO UPDATE SET
            parent_span_id = excluded.parent_span_id,
            name = excluded.name,
            kind = excluded.kind,
            start_time_ns = excluded.start_time_ns,
            end_time_ns = excluded.end_time_ns,
            duration_ns = excluded.duration_ns,
            status_code = excluded.status_code,
            status_message = excluded.status_message,
            trace_state = excluded.trace_state,
            flags = excluded.flags,
            dropped_attributes_count = excluded.dropped_attributes_count,
            dropped_events_count = excluded.dropped_events_count,
            dropped_links_count = excluded.dropped_links_count,
            service_name = excluded.service_name,
            resource_attributes = excluded.resource_attributes,
            resource_dropped_attributes_count = excluded.resource_dropped_attributes_count,
            resource_schema_url = excluded.resource_schema_url,
            scope_name = excluded.scope_name,
            scope_version = excluded.scope_version,
            scope_attributes = excluded.scope_attributes,
            scope_dropped_attributes_count = excluded.scope_dropped_attributes_count,
            scope_schema_url = excluded.scope_schema_url,
            attributes = excluded.attributes,
            events = excluded.events,
            links = excluded.links,
            received_at = CURRENT_TIMESTAMP`

  for (let i = 0; i < spans.length; i += INSERT_CHUNK) {
    const chunk = spans.slice(i, i + INSERT_CHUNK)
    await conn.run(
      `INSERT INTO spans (
            trace_id, span_id, parent_span_id, name, kind,
            start_time_ns, end_time_ns, duration_ns, status_code, status_message,
            trace_state, flags, dropped_attributes_count, dropped_events_count,
            dropped_links_count, service_name, resource_attributes,
            resource_dropped_attributes_count, resource_schema_url,
            scope_name, scope_version, scope_attributes, scope_dropped_attributes_count,
            scope_schema_url, attributes, events, links
        ) VALUES ${valuePlaceholders(chunk.length, SPAN_COLUMNS)}
        ${conflict}`,
      chunk.flatMap(spanValues),
    )
  }
}

export async function rebuild(
  conn: DbConn,
  traceIds: string[],
): Promise<RebuildRow[]> {
  if (traceIds.length === 0) return []

  const rows: RebuildRow[] = []
  for (let i = 0; i < traceIds.length; i += INSERT_CHUNK) {
    const chunk = traceIds.slice(i, i + INSERT_CHUNK)
    const inList = chunk.map(() => "?").join(", ")
    const rebuildRows = await conn.all(
      `WITH ranked AS (
         SELECT
           trace_id,
           span_id,
           name,
           service_name,
           status_code,
           attributes,
           row_number() OVER (
             PARTITION BY trace_id
             ORDER BY
               CASE WHEN parent_span_id IS NULL OR parent_span_id = '' THEN 0 ELSE 1 END,
               start_time_ns ASC
           ) AS rn
         FROM spans
         WHERE trace_id IN (${inList})
       ),
       agg AS (
         SELECT
           trace_id,
           min(start_time_ns) AS start_time_ns,
           max(end_time_ns) AS end_time_ns,
           count(*) AS span_count,
           MAX(CASE WHEN parent_span_id IS NULL OR parent_span_id = '' THEN 1 ELSE 0 END) AS root_observed
         FROM spans
         WHERE trace_id IN (${inList})
         GROUP BY trace_id
       )
       SELECT
         a.trace_id,
         a.start_time_ns,
         a.end_time_ns,
         (CASE WHEN a.end_time_ns > a.start_time_ns THEN a.end_time_ns - a.start_time_ns ELSE 0 END) AS duration_ns,
         a.span_count,
         a.root_observed,
         r.span_id AS root_span_id,
         r.service_name AS root_service,
         r.name AS root_name,
         r.status_code AS root_status_code,
         r.attributes AS root_attributes
       FROM agg a
       JOIN ranked r ON r.trace_id = a.trace_id AND r.rn = 1`,
      [...chunk, ...chunk],
    )
    for (const row of rebuildRows) {
      rows.push({
        traceId: String(row.trace_id),
        startTimeNs: toBigInt(row.start_time_ns),
        endTimeNs: toBigInt(row.end_time_ns),
        durationNs: toBigInt(row.duration_ns),
        spanCount: toNumber(row.span_count),
        rootObserved: Boolean(row.root_observed),
        rootSpanId: emptyToUndef(row.root_span_id as string | null),
        rootService: emptyToUndef(row.root_service as string | null),
        rootName: emptyToUndef(row.root_name as string | null),
        rootStatusCode: toNumber(row.root_status_code),
        rootAttributes: parseJson(row.root_attributes) ?? null,
      })
    }
  }
  return rows
}

export async function upsert(
  conn: DbConn,
  summaries: TraceSummary[],
): Promise<void> {
  if (summaries.length === 0) return

  const conflict = `ON CONFLICT (trace_id) DO UPDATE SET
                root_span_id = excluded.root_span_id,
                root_observed = excluded.root_observed,
                root_service = excluded.root_service,
                root_name = excluded.root_name,
                start_time_ns = excluded.start_time_ns,
                end_time_ns = excluded.end_time_ns,
                duration_ns = excluded.duration_ns,
                status_code = excluded.status_code,
                span_count = excluded.span_count,
                http_method = excluded.http_method,
                http_status_code = excluded.http_status_code,
                http_url = excluded.http_url,
                http_route = excluded.http_route,
                updated_at = CURRENT_TIMESTAMP`

  for (let i = 0; i < summaries.length; i += INSERT_CHUNK) {
    const chunk = summaries.slice(i, i + INSERT_CHUNK)
    await conn.run(
      `INSERT INTO traces (
                trace_id, root_span_id, root_observed, root_service, root_name,
                start_time_ns, end_time_ns, duration_ns, status_code, span_count,
                http_method, http_status_code, http_url, http_route
            ) VALUES ${valuePlaceholders(chunk.length, TRACE_COLUMNS)}
            ${conflict}`,
      chunk.flatMap(summaryValues),
    )
  }
}

async function distinctStrings(conn: DbConn, sql: string): Promise<string[]> {
  const rows = await conn.all(sql)
  return rows.map((row) => String(row.value))
}
