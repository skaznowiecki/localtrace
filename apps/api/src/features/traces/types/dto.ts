import type { Json } from "@shared/helpers"

export type TraceCardDto = {
  id: string
  service: string
  root_service: string
  name: string
  duration_ms: number
  span_count: number
  status: string
  http_status_code?: number
  http_method?: string
  http_url?: string
  http_route?: string
  start_time: string
  breakdown: BreakdownDto[] | null
}

export type BreakdownDto = {
  name: string
  duration_ms: number
  share: number
}

export type FacetValueDto = {
  value: string
  count: number
}

export type TraceFacetsDto = {
  services: FacetValueDto[]
  statuses: FacetValueDto[]
  methods: FacetValueDto[]
  http_status_codes: FacetValueDto[]
  routes: FacetValueDto[]
  durations: FacetValueDto[]
}

export type SpanDto = {
  id: string
  parent_id: string | null
  name: string
  service: string
  kind: number
  status: string
  status_message: string | null
  start_offset_ms: number
  duration_ms: number
  attributes: Json
  events: Json
  links: Json
  resource_attributes: Json
  scope_name: string | null
  scope_version: string | null
  type?: string
  payload_path?: string
  provider: string
}

export type TraceDetailDto = {
  trace: TraceCardDto
  spans: SpanDto[]
}

export type SpanOverviewDto = {
  id: string
  parent_id: string | null
  name: string
  service: string
  type?: string
  status: string
  start_offset_ms: number
  duration_ms: number
  payload_path?: string
}

export type TraceOverviewDto = {
  trace: TraceCardDto
  spans: SpanOverviewDto[]
  counts: {
    spans: number
    errors: number
    by_type: Record<string, number>
  }
  hints: string[]
}

export type TypedSpanDto = {
  span_id: string
  trace_id: string
  name: string
  type: string
  service: string
  status: string
  duration_ms: number
  start_offset_ms: number
  payload_path?: string
  payload: Record<string, unknown>
}

export type SqlQueryDto = {
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
