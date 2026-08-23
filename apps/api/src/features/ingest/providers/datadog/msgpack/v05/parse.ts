import { invalidPayload } from "../../helpers/ids"
import { unpackMsgpack } from "../../helpers/unpack"
import { asList, asNumber, asRecord, asString } from "../../helpers/values"
import { mapTraces } from "../../mappers/traces"
import type { SpanRecord } from "@features/traces/types/span"

export function parse(body: Uint8Array): SpanRecord[] {
  const decoded = unpackMsgpack(body)
  if (!Array.isArray(decoded) || decoded.length < 2) {
    invalidPayload("v0.5 payload must be [dictionary, traces]")
  }
  const dict = asList(decoded[0]).map((item) => asString(item) ?? "")
  const traces = asList(decoded[1]).map((trace) =>
    asList(trace).map((span) => expand(dict, asList(span))),
  )
  return mapTraces(traces)
}

function dictAt(dict: string[], index: unknown): string {
  const i = typeof index === "number" ? index : Number(index)
  if (!Number.isInteger(i) || i < 0 || i >= dict.length) return ""
  return dict[i] ?? ""
}

function expand(dict: string[], slots: unknown[]): Record<string, unknown> {
  const metaRaw = asRecord(slots[9])
  const meta: Record<string, string> = {}
  for (const [key, value] of Object.entries(metaRaw)) {
    const k = dictAt(dict, Number(key))
    const v = dictAt(dict, value)
    if (k) meta[k] = v
  }
  const metricsRaw = asRecord(slots[10])
  const metrics: Record<string, number> = {}
  for (const [key, value] of Object.entries(metricsRaw)) {
    const k = dictAt(dict, Number(key))
    const n = asNumber(value)
    if (k && n != null) metrics[k] = n
  }
  return {
    service: dictAt(dict, slots[0]),
    name: dictAt(dict, slots[1]),
    resource: dictAt(dict, slots[2]),
    trace_id: slots[3],
    span_id: slots[4],
    parent_id: slots[5],
    start: slots[6],
    duration: slots[7],
    error: slots[8],
    meta,
    metrics,
    type: dictAt(dict, slots[11]),
  }
}
