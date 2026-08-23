import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { LIST_PAGE_SIZE, nextPageOffset } from "@/lib/infinite-pages"

import type {
  JsonValue,
  TraceDetail,
  TraceListItem,
  TraceLog,
  TraceSqlQuery,
  TraceStatus,
} from "../types"
import {
  filtersToSearchParams,
  type TraceQueryFilters,
} from "../lib/trace-filter"

type ApiBreakdownDto = {
  name: string
  duration_ms: number
  share: number
}

type ApiTraceCard = {
  id: string
  service: string
  root_service: string
  name: string
  duration_ms: number
  span_count: number
  status: string
  http_status_code?: number | string | null
  http_method?: string | null
  http_url?: string | null
  http_route?: string | null
  start_time: string
  breakdown?: ApiBreakdownDto[] | null
}

type ApiSpanDto = {
  id: string
  parent_id: string | null
  name: string
  service: string
  kind: number
  status: string
  status_message: string | null
  start_offset_ms: number
  duration_ms: number
  attributes: JsonValue
  events: JsonValue
  links: JsonValue
  resource_attributes: JsonValue
  scope_name: string | null
  scope_version: string | null
  type?: string | null
  payload_path?: string | null
  provider?: string | null
}

type ApiTraceDetail = {
  trace: ApiTraceCard
  spans: ApiSpanDto[]
}

type ApiLogDto = {
  id: string
  time: string
  severity_number: number | null
  severity_text: string | null
  body: JsonValue
  service_name: string
  attributes: JsonValue
  scope_name: string | null
  scope_version: string | null
  trace_id: string | null
  span_id: string | null
  provider?: string | null
}

type ApiSqlQueryDto = {
  span_id: string
  name: string
  statement: string
  duration_ms: number
  start_offset_ms: number
  started_at: string | null
  db_system: string | null
  host: string | null
  status: string
  share: number
}

type ApiFacetValue = {
  value: string
  count: number
}

type ApiTraceFacets = {
  services: ApiFacetValue[]
  statuses: ApiFacetValue[]
  methods: ApiFacetValue[]
  http_status_codes: ApiFacetValue[]
  routes: ApiFacetValue[]
  durations: ApiFacetValue[]
}

export type FacetValue = {
  value: string
  count: number
}

export type TraceFacets = {
  services: FacetValue[]
  statuses: FacetValue[]
  methods: FacetValue[]
  httpStatusCodes: FacetValue[]
  routes: FacetValue[]
  durations: FacetValue[]
}

function toTraceStatus(status: string): TraceStatus {
  if (status === "error") return "error"
  if (status === "ok") return "ok"
  return "unset"
}

function mapTraceCard(trace: ApiTraceCard): TraceListItem {
  const httpStatusCode =
    trace.http_status_code == null || trace.http_status_code === ""
      ? null
      : String(trace.http_status_code)

  return {
    id: trace.id,
    service: trace.service,
    rootService: trace.root_service,
    name: trace.name,
    durationMs: trace.duration_ms,
    spanCount: trace.span_count,
    status: toTraceStatus(trace.status),
    httpStatusCode,
    httpMethod:
      trace.http_method == null || trace.http_method === ""
        ? null
        : trace.http_method,
    httpUrl:
      trace.http_url == null || trace.http_url === "" ? null : trace.http_url,
    httpRoute:
      trace.http_route == null || trace.http_route === ""
        ? null
        : trace.http_route,
    startTime: trace.start_time,
    breakdown:
      trace.breakdown == null
        ? null
        : trace.breakdown.map((item) => ({
            name: item.name,
            durationMs: item.duration_ms,
            share: item.share,
          })),
  }
}

function mapSpan(span: ApiSpanDto) {
  return {
    id: span.id,
    parentId: span.parent_id,
    name: span.name,
    service: span.service,
    kind: span.kind,
    status: toTraceStatus(span.status),
    statusMessage: span.status_message,
    startOffsetMs: span.start_offset_ms,
    durationMs: span.duration_ms,
    attributes: span.attributes ?? {},
    events: span.events ?? [],
    links: span.links ?? [],
    resourceAttributes: span.resource_attributes ?? {},
    scopeName: span.scope_name,
    scopeVersion: span.scope_version,
    type: span.type || null,
    payloadPath: span.payload_path || null,
    provider: span.provider ?? null,
  }
}

function mapLog(log: ApiLogDto): TraceLog {
  return {
    id: log.id,
    time: log.time,
    severityNumber: log.severity_number,
    severityText: log.severity_text,
    body: log.body ?? null,
    service: log.service_name,
    attributes: log.attributes ?? {},
    scopeName: log.scope_name,
    scopeVersion: log.scope_version,
    traceId: log.trace_id,
    spanId: log.span_id,
    provider: log.provider ?? null,
  }
}

function mapSqlQuery(query: ApiSqlQueryDto): TraceSqlQuery {
  return {
    spanId: query.span_id,
    name: query.name,
    statement: query.statement,
    durationMs: query.duration_ms,
    startOffsetMs: query.start_offset_ms,
    startedAt: query.started_at,
    dbSystem: query.db_system,
    host: query.host,
    status: toTraceStatus(query.status),
    share: query.share,
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export async function fetchTraces(
  filters: TraceQueryFilters = {},
  limit = LIST_PAGE_SIZE,
  offset = 0,
): Promise<TraceListItem[]> {
  const params = filtersToSearchParams(filters, limit, offset)
  const response = await fetch(`/api/traces?${params.toString()}`)
  const traces = await parseJson<ApiTraceCard[]>(response)
  return traces.map(mapTraceCard)
}

export async function fetchTraceFacets(): Promise<TraceFacets> {
  const response = await fetch("/api/traces/facets")
  const facets = await parseJson<ApiTraceFacets>(response)
  return {
    services: facets.services ?? [],
    statuses: facets.statuses ?? [],
    methods: facets.methods ?? [],
    httpStatusCodes: facets.http_status_codes ?? [],
    routes: facets.routes ?? [],
    durations: facets.durations ?? [],
  }
}

export async function fetchTraceDetail(traceId: string): Promise<TraceDetail> {
  const response = await fetch(`/api/traces/${encodeURIComponent(traceId)}`)
  const detail = await parseJson<ApiTraceDetail>(response)
  const spans = detail.spans.map(mapSpan)

  return { trace: mapTraceCard(detail.trace), spans }
}

export async function fetchTraceLogs(traceId: string): Promise<TraceLog[]> {
  const response = await fetch(
    `/api/traces/${encodeURIComponent(traceId)}/logs`,
  )
  const logs = await parseJson<ApiLogDto[]>(response)
  return logs.map(mapLog)
}

export async function fetchTraceSql(traceId: string): Promise<TraceSqlQuery[]> {
  const response = await fetch(
    `/api/traces/${encodeURIComponent(traceId)}/sql`,
  )
  const queries = await parseJson<ApiSqlQueryDto[]>(response)
  return queries.map(mapSqlQuery)
}

/**
 * Query-key factory — the single source of truth for cache keys. Keeping keys
 * hierarchical (`traces` → `list`/`detail`/`logs`/`sql`) makes partial invalidation
 * easy (e.g. `queryClient.invalidateQueries({ queryKey: traceKeys.all })`).
 */
export type TraceListLiveOptions = {
  /** When true, poll every 2s and recompute sliding lookback in queryFn. */
  live?: boolean
  /** Relative lookback window in ms; null/undefined = Latest (no since). */
  lookbackMs?: number | null
}

export const traceKeys = {
  all: ["traces"] as const,
  lists: () => [...traceKeys.all, "list"] as const,
  list: (
    filters: TraceQueryFilters,
    limit: number,
    liveOptions?: TraceListLiveOptions,
  ) =>
    [
      ...traceKeys.lists(),
      {
        filters,
        limit,
        live: liveOptions?.live ?? false,
        lookbackMs: liveOptions?.lookbackMs ?? null,
      },
    ] as const,
  facets: () => [...traceKeys.all, "facets"] as const,
  details: () => [...traceKeys.all, "detail"] as const,
  detail: (traceId: string) => [...traceKeys.details(), traceId] as const,
  logs: (traceId: string) => [...traceKeys.all, "logs", traceId] as const,
  sql: (traceId: string) => [...traceKeys.all, "sql", traceId] as const,
}

export function traceListQuery(
  filters: TraceQueryFilters,
  limit = LIST_PAGE_SIZE,
  liveOptions: TraceListLiveOptions = {},
) {
  const live = liveOptions.live ?? false
  const lookbackMs = liveOptions.lookbackMs ?? null

  return infiniteQueryOptions({
    queryKey: traceKeys.list(filters, limit, liveOptions),
    queryFn: ({ pageParam }) => {
      const since =
        live && lookbackMs != null
          ? new Date(Date.now() - lookbackMs).toISOString()
          : filters.since
      return fetchTraces({ ...filters, since }, limit, pageParam)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      nextPageOffset(lastPage, allPages, limit),
    staleTime: live ? 0 : undefined,
  })
}

export function traceFacetsQuery() {
  return queryOptions({
    queryKey: traceKeys.facets(),
    queryFn: () => fetchTraceFacets(),
    // Facets change slowly relative to the trace list.
    staleTime: 30_000,
  })
}

export function traceDetailQuery(traceId: string | null) {
  return queryOptions({
    queryKey: traceKeys.detail(traceId ?? "__none__"),
    queryFn: () => fetchTraceDetail(traceId!),
    enabled: traceId != null,
    // A finished trace is immutable, so cache detail aggressively.
    staleTime: 60_000,
  })
}

export function traceLogsQuery(traceId: string | null) {
  return queryOptions({
    queryKey: traceKeys.logs(traceId ?? "__none__"),
    queryFn: () => fetchTraceLogs(traceId!),
    enabled: traceId != null,
    staleTime: 60_000,
  })
}

export function traceSqlQuery(traceId: string | null) {
  return queryOptions({
    queryKey: traceKeys.sql(traceId ?? "__none__"),
    queryFn: () => fetchTraceSql(traceId!),
    enabled: traceId != null,
    staleTime: 60_000,
  })
}
