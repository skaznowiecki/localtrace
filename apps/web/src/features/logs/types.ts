export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

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
