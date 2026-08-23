import type { Json } from "@shared/helpers"

export type SpanTypeInput = {
  name: string
  attributes: Json
}

export type SpanClass = {
  type: string
  payloadPath?: string
}

export type SpanTypeDetector = {
  id: string
  match: (span: SpanTypeInput) => SpanClass | undefined
}
