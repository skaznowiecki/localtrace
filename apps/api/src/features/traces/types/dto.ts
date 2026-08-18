import type { Json } from "../../../shared/helpers"

export type TraceCardDto = {
  id: string
  service: string
  root_service: string
  name: string
  duration_ms: number
  span_count: number
  status: string
  http_status_code?: number
  http_url?: string
  start_time: string
}

export type RouteFacetDto = {
  value: string
  count: number
}

export type TraceFacetsDto = {
  services: string[]
  statuses: string[]
  methods: string[]
  http_status_codes: number[]
  routes: RouteFacetDto[]
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
}

export type TraceDetailDto = {
  trace: TraceCardDto
  spans: SpanDto[]
}
