import type { Json } from "../../../shared/helpers"

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
}

export type TraceListFilters = {
  limit: number
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
