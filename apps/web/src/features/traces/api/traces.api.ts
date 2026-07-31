import { queryOptions } from "@tanstack/react-query"

import type {
  JsonValue,
  TraceDetail,
  TraceListItem,
  TraceLog,
  TraceStatus,
} from "../types"
import {
  filtersToSearchParams,
  type TraceQueryFilters,
} from "../lib/trace-filter"

type ApiTraceCard = {
  id: string
  service: string
  root_service: string
  name: string
  duration_ms: number
  span_count: number
  status: string
  /** Present when the API denormalizes root-span HTTP status onto the card. */
  http_status_code?: number | string | null
  /** Root-span request path, denormalized so method-only names (OPTIONS) show it. */
  http_url?: string | null
  start_time: string
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
}

type ApiRouteFacet = {
  value: string
  count: number
}

type ApiTraceFacets = {
  services: string[]
  statuses: string[]
  methods: string[]
  http_status_codes: number[]
  routes: ApiRouteFacet[]
}

export type RouteFacet = {
  value: string
  count: number
}

export type TraceFacets = {
  services: string[]
  statuses: string[]
  methods: string[]
  httpStatusCodes: number[]
  routes: RouteFacet[]
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
    httpUrl:
      trace.http_url == null || trace.http_url === "" ? null : trace.http_url,
    startTime: trace.start_time,
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
  limit = 100,
): Promise<TraceListItem[]> {
  const params = filtersToSearchParams(filters, limit)
  const response = await fetch(`/api/traces?${params.toString()}`)
  const traces = await parseJson<ApiTraceCard[]>(response)
  return traces.map(mapTraceCard)
}

export async function fetchTraceFacets(): Promise<TraceFacets> {
  const response = await fetch("/api/traces/facets")
  const facets = await parseJson<ApiTraceFacets>(response)
  return {
    services: facets.services ?? [],
    statuses: facets.statuses?.length ? facets.statuses : ["ok", "error"],
    methods: facets.methods ?? [],
    httpStatusCodes: facets.http_status_codes ?? [],
    routes: facets.routes ?? [],
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

/**
 * Query-key factory — the single source of truth for cache keys. Keeping keys
 * hierarchical (`traces` → `list`/`detail`/`logs`) makes partial invalidation
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
}

export function traceListQuery(
  filters: TraceQueryFilters,
  limit = 100,
  liveOptions: TraceListLiveOptions = {},
) {
  const live = liveOptions.live ?? false
  const lookbackMs = liveOptions.lookbackMs ?? null

  return queryOptions({
    queryKey: traceKeys.list(filters, limit, liveOptions),
    queryFn: () => {
      // Sliding window while LIVE: recompute `since` on every poll.
      // When paused, `filters.since` is the frozen absolute bound (if any).
      const since =
        live && lookbackMs != null
          ? new Date(Date.now() - lookbackMs).toISOString()
          : filters.since
      return fetchTraces({ ...filters, since }, limit)
    },
    refetchInterval: live ? 2_000 : false,
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
