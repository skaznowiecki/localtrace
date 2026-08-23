import type { IngestProviderName, Json } from "@shared/helpers"

export type SpanRecord = {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  kind: number
  startTimeNs: bigint
  endTimeNs: bigint
  durationNs: bigint
  statusCode: number
  statusMessage?: string
  traceState?: string
  flags: number
  droppedAttributesCount: number
  droppedEventsCount: number
  droppedLinksCount: number
  serviceName: string
  resourceAttributes: Json
  resourceDroppedAttributesCount: number
  resourceSchemaUrl?: string
  scopeName?: string
  scopeVersion?: string
  scopeAttributes: Json
  scopeDroppedAttributesCount: number
  scopeSchemaUrl?: string
  attributes: Json
  events: Json
  links: Json
  ingestProvider?: IngestProviderName
}

export type TraceStatus = "ok" | "error"

export type TraceSummary = {
  traceId: string
  rootSpanId?: string
  rootObserved: boolean
  rootService?: string
  rootName?: string
  startTimeNs: bigint
  endTimeNs: bigint
  durationNs: bigint
  status: TraceStatus
  spanCount: number
  httpMethod?: string
  httpStatusCode?: number
  httpUrl?: string
  httpRoute?: string
  breakdown: BreakdownItem[] | null
}

export type BreakdownItem = {
  name: string
  durationNs: number
  spanCount: number
}

export type TraceSortField =
  | "date"
  | "root_service"
  | "name"
  | "duration"
  | "spans"
  | "status"

export type TraceSortOrder = "asc" | "desc"

export type TraceListFilters = {
  limit: number
  offset: number
  sort: TraceSortField
  order: TraceSortOrder
  service?: string
  status?: string
  method?: string
  httpStatusCode?: number
  name?: string
  url?: string
  durationMinNs?: bigint
  durationMaxNs?: bigint
  sinceNs?: bigint
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
