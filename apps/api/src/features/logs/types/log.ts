import type { IngestProviderName, Json } from "@shared/helpers"

export type LogRecord = {
  id: string
  timeNs: bigint
  observedTimeNs?: bigint
  severityNumber?: number
  severityText?: string
  bodyAny?: Json
  eventName?: string
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
  droppedAttributesCount: number
  flags: number
  traceId?: string
  spanId?: string
  ingestProvider?: IngestProviderName
}

export type LogDto = {
  id: string
  time: string
  severity_number: number | null
  severity_text: string | null
  body: Json
  service_name: string
  attributes: Json
  scope_name: string | null
  scope_version: string | null
  trace_id: string | null
  span_id: string | null
  provider: string
}

export type LogSortField = "date" | "service" | "severity"
export type LogSortOrder = "asc" | "desc"

export type LogListFilters = {
  limit: number
  offset: number
  sort: LogSortField
  order: LogSortOrder
  service?: string
  severity?: string
  message?: string
  traceId?: string
  sinceNs?: bigint
  untilNs?: bigint
  raw?: boolean
}

export type FacetValue = {
  value: string
  count: number
}

export type LogFacets = {
  services: FacetValue[]
  severities: FacetValue[]
}

export type LogFacetsDto = {
  services: FacetValue[]
  severities: FacetValue[]
}
