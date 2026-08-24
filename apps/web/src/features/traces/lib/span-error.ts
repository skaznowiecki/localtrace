import type { JsonValue, Span } from "../types"
import { readAttr } from "./span-attributes"

export type SpanErrorInfo = {
  type: string | null
  message: string | null
  stacktrace: string | null
}

function asRecord(value: JsonValue): Record<string, JsonValue> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value
  }
  return null
}

function eventList(events: JsonValue): JsonValue[] {
  if (Array.isArray(events)) return events
  const record = asRecord(events)
  if (!record) return []
  return Object.values(record)
}

function eventName(event: JsonValue): string | null {
  const record = asRecord(event)
  if (!record) return null
  return typeof record.name === "string" ? record.name : null
}

function eventAttrs(event: JsonValue): JsonValue {
  const record = asRecord(event)
  if (!record) return null
  if ("attributes" in record) return record.attributes
  if ("attrs" in record) return record.attrs
  return record
}

function errorFromAttrs(attrs: JsonValue): SpanErrorInfo | null {
  const type = readAttr(
    attrs,
    "exception.type",
    "error.type",
    "error.kind",
  )
  const message = readAttr(
    attrs,
    "exception.message",
    "error.message",
    "error.msg",
  )
  const stacktrace = readAttr(
    attrs,
    "exception.stacktrace",
    "exception.stack",
    "error.stack",
    "error.stacktrace",
  )
  if (!type && !message && !stacktrace) return null
  return { type, message, stacktrace }
}

function mergeError(
  ...parts: Array<SpanErrorInfo | null | undefined>
): SpanErrorInfo {
  let type: string | null = null
  let message: string | null = null
  let stacktrace: string | null = null
  for (const part of parts) {
    if (!part) continue
    type ??= part.type
    message ??= part.message
    stacktrace ??= part.stacktrace
  }
  return { type, message, stacktrace }
}

/** Exception events (OTLP) plus error.* attrs / status message. */
export function extractSpanError(
  span: Pick<Span, "status" | "statusMessage" | "attributes" | "events">,
): SpanErrorInfo | null {
  let fromEvent: SpanErrorInfo | null = null
  for (const event of eventList(span.events)) {
    const attrs = errorFromAttrs(eventAttrs(event))
    if (eventName(event) === "exception" || attrs) {
      fromEvent = mergeError(fromEvent, attrs)
      break
    }
  }

  const fromAttrs = errorFromAttrs(span.attributes)
  const fromStatus: SpanErrorInfo | null = span.statusMessage
    ? { type: null, message: span.statusMessage, stacktrace: null }
    : null

  if (!fromEvent && !fromAttrs && !fromStatus && span.status !== "error") {
    return null
  }

  return mergeError(fromEvent, fromStatus, fromAttrs)
}

export function firstErrorHint(spans: Span[], max = 240): string | null {
  const span = spans.find((item) => item.status === "error")
  if (!span) return null
  const error = extractSpanError(span)
  const detail = [error?.type, error?.message].filter(Boolean).join(": ")
  const text = detail ? `${span.name} — ${detail}` : span.name
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}
