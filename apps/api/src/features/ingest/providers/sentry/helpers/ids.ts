import { optionalId, spanId, traceId } from "@shared/helpers"

export function optionalTraceId(value: unknown): string | undefined {
  return optionalId(traceId, value)
}

export function optionalSpanId(value: unknown): string | undefined {
  return optionalId(spanId, value)
}
