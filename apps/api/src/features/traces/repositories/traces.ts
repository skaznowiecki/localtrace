import type { DbConn, SqlValue } from "@shared/db"
import {
  INSERT_CHUNK,
  valuePlaceholders,
} from "@shared/db"
import {
  emptyToUndef,
  parseJson,
  toBigInt,
  toNumber,
  type IngestProviderName,
  type Json,
} from "@shared/helpers"
import { parse as parseBreakdown } from "../helpers/breakdown"
import type {
  FacetValue,
  SpanRecord,
  TraceFacets,
  TraceListFilters,
  TraceSortField,
  TraceSortOrder,
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
  rootIngestProvider?: IngestProviderName
}

const TRACE_SELECT = `SELECT trace_id, root_span_id, root_observed, root_service, root_name,
        start_time_ns, end_time_ns, duration_ns, status_code, span_count,
        http_method, http_status_code, http_url, http_route, service_breakdown
 FROM traces`

const SORT_SQL: Record<TraceSortField, string> = {
  date: "start_time_ns",
  root_service: "root_service COLLATE NOCASE",
  name: "root_name COLLATE NOCASE",
  duration: "duration_ns",
  spans: "span_count",
  status:
    "COALESCE(http_status_code, CASE status_code WHEN 'error' THEN 500 WHEN 'ok' THEN 200 ELSE 0 END)",
}

const ORDER_SQL: Record<TraceSortOrder, string> = {
  asc: "ASC",
  desc: "DESC",
}

const ATTR_KEY_RE = /^[A-Za-z0-9_.-]+$/

function jsonExtractPaths(
  path: string,
): { nested: string; flat: string } | null {
  if (!ATTR_KEY_RE.test(path)) return null
  const segments = path.split(".").filter((segment) => segment.length > 0)
  if (segments.length === 0) return null
  let nested = "$"
  for (const segment of segments) {
    nested += /^\d+$/.test(segment) ? `[${segment}]` : `.${segment}`
  }
  return { nested, flat: `$."${path}"` }
}

function orderBy(filters: TraceListFilters): string {
  const col = SORT_SQL[filters.sort]
  const dir = ORDER_SQL[filters.order]
  if (filters.sort === "date") {
    return `ORDER BY ${col} ${dir} LIMIT ? OFFSET ?`
  }
  return `ORDER BY ${col} ${dir}, start_time_ns DESC LIMIT ? OFFSET ?`
}

const SPAN_SELECT = `SELECT trace_id, span_id, parent_span_id, name, kind,
        start_time_ns, end_time_ns, duration_ns, status_code, status_message,
        trace_state, flags, dropped_attributes_count, dropped_events_count,
        dropped_links_count, service_name, resource_attributes,
        resource_dropped_attributes_count, resource_schema_url,
        scope_name, scope_version, scope_attributes, scope_dropped_attributes_count,
        scope_schema_url, attributes, events, links, ingest_provider
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
    breakdown: parseBreakdown(parseJson(row.service_breakdown)),
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
    ingestProvider: (row.ingest_provider as IngestProviderName) ?? "otlp",
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
  if (filters.untilNs != null) {
    conditions.push("start_time_ns <= ?")
    params.push(filters.untilNs)
  }
  for (const attr of filters.attrs ?? []) {
    const paths = jsonExtractPaths(attr.key)
    if (!paths) {
      if (!attr.exclude) conditions.push("1 = 0")
      continue
    }
    const matchSql = `(
      CAST(json_extract(s.attributes, ?) AS TEXT) = ?
      OR CAST(json_extract(s.attributes, ?) AS TEXT) = ?
      OR CAST(json_extract(s.resource_attributes, ?) AS TEXT) = ?
      OR CAST(json_extract(s.resource_attributes, ?) AS TEXT) = ?
    )`
    const existsSql = `EXISTS (
      SELECT 1 FROM spans s
      WHERE s.trace_id = traces.trace_id AND ${matchSql}
    )`
    conditions.push(attr.exclude ? `NOT ${existsSql}` : existsSql)
    params.push(
      paths.nested,
      attr.value,
      paths.flat,
      attr.value,
      paths.nested,
      attr.value,
      paths.flat,
      attr.value,
    )
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""
  params.push(filters.limit, filters.offset)
  const rows = await conn.all(
    `${TRACE_SELECT}${where} ${orderBy(filters)}`,
    params,
  )
  return rows.map((row) => mapTrace(row))
}

export async function count(
  conn: DbConn,
  filters: TraceListFilters,
): Promise<number> {
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
  if (filters.untilNs != null) {
    conditions.push("start_time_ns <= ?")
    params.push(filters.untilNs)
  }
  for (const attr of filters.attrs ?? []) {
    const paths = jsonExtractPaths(attr.key)
    if (!paths) {
      if (!attr.exclude) conditions.push("1 = 0")
      continue
    }
    const matchSql = `(
      CAST(json_extract(s.attributes, ?) AS TEXT) = ?
      OR CAST(json_extract(s.attributes, ?) AS TEXT) = ?
      OR CAST(json_extract(s.resource_attributes, ?) AS TEXT) = ?
      OR CAST(json_extract(s.resource_attributes, ?) AS TEXT) = ?
    )`
    const existsSql = `EXISTS (
      SELECT 1 FROM spans s
      WHERE s.trace_id = traces.trace_id AND ${matchSql}
    )`
    conditions.push(attr.exclude ? `NOT ${existsSql}` : existsSql)
    params.push(
      paths.nested,
      attr.value,
      paths.flat,
      attr.value,
      paths.nested,
      attr.value,
      paths.flat,
      attr.value,
    )
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""
  const rows = await conn.all(`SELECT count(*) AS n FROM traces${where}`, params)
  return toNumber(rows[0]?.n)
}

export async function recentIds(conn: DbConn, limit = 3): Promise<string[]> {
  const rows = await conn.all(
    `SELECT trace_id FROM traces ORDER BY start_time_ns DESC LIMIT ?`,
    [limit],
  )
  return rows.map((row) => String(row.trace_id))
}

export async function findSpans(
  conn: DbConn,
  spanId: string,
  traceId?: string,
): Promise<SpanRecord[]> {
  if (traceId) {
    const rows = await conn.all(
      `${SPAN_SELECT} WHERE trace_id = ? AND span_id = ?`,
      [traceId, spanId],
    )
    return rows.map((row) => mapSpan(row))
  }
  const rows = await conn.all(`${SPAN_SELECT} WHERE span_id = ? LIMIT 3`, [
    spanId,
  ])
  return rows.map((row) => mapSpan(row))
}

export type SpanSearchFilters = {
  q?: string
  service?: string
  sinceNs?: bigint
  untilNs?: bigint
  scanLimit: number
}

export async function searchSpans(
  conn: DbConn,
  filters: SpanSearchFilters,
): Promise<SpanRecord[]> {
  const conditions: string[] = []
  const params: SqlValue[] = []
  if (filters.service) {
    conditions.push("service_name = ?")
    params.push(filters.service)
  }
  if (filters.sinceNs != null) {
    conditions.push("start_time_ns >= ?")
    params.push(filters.sinceNs)
  }
  if (filters.untilNs != null) {
    conditions.push("start_time_ns <= ?")
    params.push(filters.untilNs)
  }
  if (filters.q) {
    conditions.push(
      "(name LIKE '%' || ? || '%' COLLATE NOCASE OR attributes LIKE '%' || ? || '%')",
    )
    params.push(filters.q, filters.q)
  }
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""
  params.push(filters.scanLimit)
  const rows = await conn.all(
    `${SPAN_SELECT}${where} ORDER BY duration_ns DESC LIMIT ?`,
    params,
  )
  return rows.map((row) => mapSpan(row))
}

const DURATION_BUCKET_VALUES = [
  "0ms-10ms",
  "10ms-50ms",
  "50ms-100ms",
  "100ms-250ms",
  "250ms-500ms",
  "500ms-1s",
  "1s-2.5s",
  "2.5s-5s",
  "5s-10s",
  ">10s",
] as const

export async function facets(conn: DbConn): Promise<TraceFacets> {
  const services = await counted(
    conn,
    `SELECT COALESCE(root_service, 'unknown_service') AS value, count(*) AS n
     FROM traces
     GROUP BY value
     ORDER BY n DESC, value`,
  )
  const statuses = await counted(
    conn,
    `SELECT status_code AS value, count(*) AS n
     FROM traces
     GROUP BY status_code
     ORDER BY n DESC, value`,
  )
  const methods = await counted(
    conn,
    `SELECT http_method AS value, count(*) AS n
     FROM traces
     WHERE http_method IS NOT NULL AND http_method <> ''
     GROUP BY http_method
     ORDER BY n DESC, value`,
  )
  const httpStatusCodes = await counted(
    conn,
    `SELECT CAST(http_status_code AS TEXT) AS value, count(*) AS n
     FROM traces
     WHERE http_status_code IS NOT NULL
     GROUP BY http_status_code
     ORDER BY n DESC, value`,
  )
  const routes = await counted(
    conn,
    `SELECT http_route AS value, count(*) AS n
     FROM traces
     WHERE http_route IS NOT NULL AND http_route <> ''
     GROUP BY http_route
     ORDER BY n DESC, value`,
  )
  const durationRows = await conn.all(
    `SELECT
       CASE
         WHEN duration_ns < 10000000 THEN 0
         WHEN duration_ns < 50000000 THEN 1
         WHEN duration_ns < 100000000 THEN 2
         WHEN duration_ns < 250000000 THEN 3
         WHEN duration_ns < 500000000 THEN 4
         WHEN duration_ns < 1000000000 THEN 5
         WHEN duration_ns < 2500000000 THEN 6
         WHEN duration_ns < 5000000000 THEN 7
         WHEN duration_ns < 10000000000 THEN 8
         ELSE 9
       END AS bucket,
       count(*) AS n
     FROM traces
     GROUP BY bucket
     ORDER BY bucket`,
  )
  const durations: FacetValue[] = durationRows.map((row) => {
    const index = toNumber(row.bucket)
    return {
      value: DURATION_BUCKET_VALUES[index] ?? ">10s",
      count: toNumber(row.n),
    }
  })

  return {
    services,
    statuses,
    methods,
    httpStatusCodes,
    routes,
    durations,
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

const SPAN_COLUMNS = 28
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
    span.ingestProvider ?? "otlp",
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
            ingest_provider = excluded.ingest_provider,
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
            scope_schema_url, attributes, events, links, ingest_provider
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
           ingest_provider,
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
         r.attributes AS root_attributes,
         r.ingest_provider AS root_ingest_provider
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
        rootIngestProvider: (row.root_ingest_provider as IngestProviderName) ?? "otlp",
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
                service_breakdown = NULL,
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

async function counted(conn: DbConn, sql: string): Promise<FacetValue[]> {
  const rows = await conn.all(sql)
  return rows.map((row) => ({
    value: String(row.value),
    count: toNumber(row.n),
  }))
}

export type BreakdownSpan = {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  kind: number
  attributes: Json
  startTimeNs: bigint
  durationNs: bigint
  ingestProvider?: IngestProviderName
}

export async function pending(conn: DbConn, limit: number): Promise<string[]> {
  const rows = await conn.all(
    `SELECT trace_id FROM traces
     WHERE service_breakdown IS NULL
     ORDER BY start_time_ns DESC
     LIMIT ?`,
    [limit],
  )
  return rows.map((row) => String(row.trace_id))
}

export async function forBreakdown(
  conn: DbConn,
  traceIds: string[],
): Promise<BreakdownSpan[]> {
  if (traceIds.length === 0) return []

  const spans: BreakdownSpan[] = []
  for (let i = 0; i < traceIds.length; i += INSERT_CHUNK) {
    const chunk = traceIds.slice(i, i + INSERT_CHUNK)
    const inList = chunk.map(() => "?").join(", ")
    const rows = await conn.all(
      `SELECT trace_id, span_id, parent_span_id, name, kind, attributes,
              start_time_ns, duration_ns, ingest_provider
       FROM spans WHERE trace_id IN (${inList})`,
      chunk,
    )
    for (const row of rows) {
      spans.push({
        traceId: String(row.trace_id),
        spanId: String(row.span_id),
        parentSpanId: emptyToUndef(row.parent_span_id as string | null),
        name: String(row.name ?? ""),
        kind: toNumber(row.kind),
        attributes: parseJson(row.attributes) ?? null,
        startTimeNs: toBigInt(row.start_time_ns),
        durationNs: toBigInt(row.duration_ns),
        ingestProvider: (row.ingest_provider as IngestProviderName) ?? "otlp",
      })
    }
  }
  return spans
}

export async function updateBreakdown(
  conn: DbConn,
  updates: { traceId: string; json: string }[],
): Promise<void> {
  for (const update of updates) {
    await conn.run(`UPDATE traces SET service_breakdown = ? WHERE trace_id = ?`, [
      update.json,
      update.traceId,
    ])
  }
}
