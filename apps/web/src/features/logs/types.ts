import type { JsonValue } from "@/lib/json"

export type { JsonValue }

export type LogListItem = {
  id: string
  time: string
  severityNumber: number | null
  severityText: string | null
  body: JsonValue
  service: string
  attributes: JsonValue
  scopeName: string | null
  scopeVersion: string | null
  traceId: string | null
  spanId: string | null
}
