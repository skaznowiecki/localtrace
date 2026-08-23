import type { Json } from "@shared/helpers"
import type { SpanRecord } from "@features/traces/types/span"
import { parentIdHex, spanIdHex, toU64, traceIdHex } from "../helpers/ids"
import { KIND_INTERNAL, STATUS_ERROR, STATUS_OK, spanKind } from "../helpers/kind"
import { toNs } from "../helpers/time"
import { asNumber, asRecord, asString, numberMap, stringMap, toJson } from "../helpers/values"

export type NamedSpan = Record<string, unknown>

export function mapTraces(payload: unknown): SpanRecord[] {
  if (!Array.isArray(payload)) return []
  const out: SpanRecord[] = []
  for (const trace of payload) {
    if (!Array.isArray(trace)) continue
    for (const item of trace) {
      const span = mapSpan(asRecord(item))
      if (span) out.push(span)
    }
  }
  return out
}

function mapSpan(span: NamedSpan): SpanRecord | undefined {
  const meta = stringMap(span.meta)
  const metrics = numberMap(span.metrics)
  const traceId = toU64(span.trace_id)
  const spanId = toU64(span.span_id)
  if (traceId === 0n || spanId === 0n) return undefined

  const start = toNs(span.start)
  const duration = toNs(span.duration)
  const end = start + duration
  const service = asString(span.service) ?? "unnamed-service"
  const operation = asString(span.name)
  const resource = asString(span.resource)
  const type = asString(span.type)
  const error = asNumber(span.error) === 1

  const attributes: { [key: string]: Json } = {}
  for (const [key, value] of Object.entries(meta)) {
    attributes[key] = value
  }
  for (const [key, value] of Object.entries(metrics)) {
    if (attributes[key] == null) attributes[key] = value
  }
  if (operation) attributes["datadog.operation"] = operation
  if (type) attributes["datadog.type"] = type

  return {
    traceId: traceIdHex(span.trace_id, meta),
    spanId: spanIdHex(span.span_id),
    parentSpanId: parentIdHex(span.parent_id),
    name: resource || operation || "unnamed",
    kind: spanKind(type, meta) || KIND_INTERNAL,
    startTimeNs: start,
    endTimeNs: end,
    durationNs: duration,
    statusCode: error ? STATUS_ERROR : STATUS_OK,
    flags: 0,
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
    serviceName: service,
    resourceAttributes: { "service.name": service },
    resourceDroppedAttributesCount: 0,
    scopeName: "datadog",
    scopeAttributes: {},
    scopeDroppedAttributesCount: 0,
    attributes,
    events: toJson(span.span_events) ?? [],
    links: toJson(span.span_links) ?? [],
  }
}
