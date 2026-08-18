import type { Json } from "../../../shared/helpers"

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
}
