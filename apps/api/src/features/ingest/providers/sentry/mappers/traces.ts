import type { Json } from "@shared/helpers"
import type { SpanRecord } from "@features/traces/types/span"
import {
  optionalSpanId,
  optionalTraceId,
} from "../helpers/ids"
import { unixSecondsToNs } from "../helpers/time"
import {
  asNumber,
  asRecord,
  asString,
  flattenAttributes,
  mergeJson,
  resourceAttributes,
  scopeFromSdk,
  serviceName,
} from "../helpers/values"

const KIND_INTERNAL = 1
const KIND_SERVER = 2
const KIND_CLIENT = 3

const STATUS_UNSET = 0
const STATUS_OK = 1
const STATUS_ERROR = 2

function emptySpan(): Pick<
  SpanRecord,
  | "traceState"
  | "flags"
  | "droppedAttributesCount"
  | "droppedEventsCount"
  | "droppedLinksCount"
  | "resourceDroppedAttributesCount"
  | "scopeDroppedAttributesCount"
  | "events"
  | "links"
> {
  return {
    flags: 0,
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
    resourceDroppedAttributesCount: 0,
    scopeDroppedAttributesCount: 0,
    events: [],
    links: [],
  }
}

function spanKind(op: string | undefined): number {
  const value = (op ?? "").toLowerCase()
  if (value.startsWith("http.server") || value.startsWith("rpc.server")) {
    return KIND_SERVER
  }
  if (
    value.startsWith("http.client") ||
    value === "http" ||
    value.startsWith("db") ||
    value.startsWith("rpc.client")
  ) {
    return KIND_CLIENT
  }
  return KIND_INTERNAL
}

function otlpStatus(status: unknown): { code: number; message?: string } {
  if (status == null || status === "") return { code: STATUS_UNSET }
  const raw = String(status)
  const lower = raw.toLowerCase()
  if (lower === "ok" || lower === "success") return { code: STATUS_OK }
  if (lower === "unknown" || lower === "unset") return { code: STATUS_UNSET }
  return { code: STATUS_ERROR, message: raw }
}

function httpFromRequest(request: Record<string, unknown>, attrs: Record<string, Json>): void {
  const method = asString(request.method)
  if (method) attrs["http.request.method"] = method.toUpperCase()
  const url = asString(request.url)
  if (url) attrs["url.full"] = url
  const route = asString(request.route)
  if (route) attrs["http.route"] = route
}

function routeFromTransaction(name: string | undefined): string | undefined {
  if (!name) return undefined
  if (name.startsWith("/")) return name
  const maybe = name.split(/\s+/)[1]
  return maybe?.startsWith("/") ? maybe : undefined
}

function overlayHttp(
  attrs: Record<string, Json>,
  data: Record<string, unknown>,
  request: Record<string, unknown>,
  contexts: Record<string, unknown>,
  transactionName?: string,
): void {
  mergeJson(attrs, data)
  httpFromRequest(request, attrs)

  const method =
    asString(data["http.request.method"]) ??
    asString(data["http.method"]) ??
    asString(request.method)
  if (method) attrs["http.request.method"] = method.toUpperCase()

  const url =
    asString(data["url.full"]) ??
    asString(data["http.url"]) ??
    asString(request.url)
  if (url) attrs["url.full"] = url

  const response = asRecord(contexts.response)
  const statusCode =
    asNumber(data["http.response.status_code"]) ??
    asNumber(data["http.status_code"]) ??
    asNumber(response.status_code)
  if (statusCode != null) {
    attrs["http.response.status_code"] = statusCode
  }

  const route =
    asString(data["http.route"]) ?? routeFromTransaction(transactionName)
  if (route) attrs["http.route"] = route
}

function record(
  partial: Omit<
    SpanRecord,
    | "traceState"
    | "flags"
    | "droppedAttributesCount"
    | "droppedEventsCount"
    | "droppedLinksCount"
    | "resourceDroppedAttributesCount"
    | "scopeDroppedAttributesCount"
    | "events"
    | "links"
    | "durationNs"
  >,
): SpanRecord {
  const start = partial.startTimeNs
  const end = partial.endTimeNs === 0n ? start : partial.endTimeNs
  return {
    ...emptySpan(),
    ...partial,
    startTimeNs: start,
    endTimeNs: end,
    durationNs: end > start ? end - start : 0n,
  }
}

export function mapTransaction(event: Record<string, unknown>): SpanRecord[] {
  const contexts = asRecord(event.contexts)
  const trace = asRecord(contexts.trace)
  const request = asRecord(event.request)
  const traceId = optionalTraceId(trace.trace_id)
  const spanId = optionalSpanId(trace.span_id)
  if (!traceId || !spanId) return []

  const op = asString(trace.op)
  const name = asString(event.transaction) ?? op ?? "transaction"
  const start = unixSecondsToNs(event.start_timestamp)
  const end = unixSecondsToNs(event.timestamp)
  const status = otlpStatus(trace.status)
  const service = serviceName(event)
  const resource = resourceAttributes(event)
  const scope = scopeFromSdk(event)
  const attrs: Record<string, Json> = {}
  if (op) attrs["sentry.op"] = op
  overlayHttp(
    attrs,
    flattenAttributes(asRecord(trace.data)),
    request,
    contexts,
    asString(event.transaction),
  )

  const out: SpanRecord[] = [
    record({
      traceId,
      spanId,
      parentSpanId: optionalSpanId(trace.parent_span_id),
      name,
      kind: spanKind(op),
      startTimeNs: start,
      endTimeNs: end,
      statusCode: status.code,
      statusMessage: status.message,
      serviceName: service,
      resourceAttributes: resource,
      scopeName: scope.name,
      scopeVersion: scope.version,
      scopeAttributes: {},
      attributes: attrs,
    }),
  ]

  for (const span of Array.isArray(event.spans) ? (event.spans as unknown[]) : []) {
    if (!span || typeof span !== "object") continue
    const mapped = mapChildSpan(span as Record<string, unknown>, {
      fallbackTraceId: traceId,
      parentSpanId: spanId,
      serviceName: service,
      resourceAttributes: resource,
      scopeName: scope.name,
      scopeVersion: scope.version,
    })
    if (mapped) out.push(mapped)
  }

  return out
}

function mapChildSpan(
  span: Record<string, unknown>,
  ctx: {
    fallbackTraceId: string
    parentSpanId: string
    serviceName: string
    resourceAttributes: Json
    scopeName?: string
    scopeVersion?: string
  },
): SpanRecord | undefined {
  const spanId = optionalSpanId(span.span_id)
  const traceId =
    span.trace_id != null ? optionalTraceId(span.trace_id) : ctx.fallbackTraceId
  if (!spanId || !traceId) return undefined

  const data = flattenAttributes(asRecord(span.data ?? span.attributes))
  const op = asString(span.op) ?? asString(data["sentry.op"])
  const name =
    asString(span.name) ?? asString(span.description) ?? op ?? "span"
  const start = unixSecondsToNs(span.start_timestamp)
  const end = unixSecondsToNs(span.end_timestamp ?? span.timestamp)
  const status = otlpStatus(span.status)
  const attrs: Record<string, Json> = {}
  if (op) attrs["sentry.op"] = op
  overlayHttp(attrs, data, asRecord(span), {}, asString(span.name))

  return record({
    traceId,
    spanId,
    parentSpanId: optionalSpanId(span.parent_span_id) ?? ctx.parentSpanId,
    name,
    kind: spanKind(op),
    startTimeNs: start,
    endTimeNs: end,
    statusCode: status.code,
    statusMessage: status.message,
    serviceName: ctx.serviceName,
    resourceAttributes: ctx.resourceAttributes,
    scopeName: ctx.scopeName,
    scopeVersion: ctx.scopeVersion,
    scopeAttributes: {},
    attributes: attrs,
  })
}

export function mapSpanItems(
  payload: Record<string, unknown>,
  envelopeHeader: Record<string, unknown> = {},
): SpanRecord[] {
  const items = Array.isArray(payload.items)
    ? (payload.items as unknown[])
    : payload.trace_id != null || payload.span_id != null
      ? [payload]
      : []

  const out: SpanRecord[] = []
  for (const item of items) {
    if (!item || typeof item !== "object") continue
    const mapped = mapStandaloneSpan(
      item as Record<string, unknown>,
      envelopeHeader,
    )
    if (mapped) out.push(mapped)
  }
  return out
}

function mapStandaloneSpan(
  span: Record<string, unknown>,
  envelopeHeader: Record<string, unknown>,
): SpanRecord | undefined {
  const traceId = optionalTraceId(span.trace_id)
  const spanId = optionalSpanId(span.span_id)
  if (!traceId || !spanId) return undefined

  const data = flattenAttributes(asRecord(span.data ?? span.attributes))
  const op = asString(span.op) ?? asString(data["sentry.op"])
  const name = asString(span.name) ?? asString(span.description) ?? op ?? "span"
  const start = unixSecondsToNs(span.start_timestamp)
  const end = unixSecondsToNs(span.end_timestamp ?? span.timestamp)
  const status = otlpStatus(span.status)
  const sdk = asRecord(envelopeHeader.sdk)
  const service =
    asString(data["service.name"]) ?? asString(sdk.name) ?? "sentry"
  const resource: Record<string, Json> = { "service.name": service }
  const sdkName = asString(sdk.name)
  if (sdkName) resource["sentry.sdk"] = sdkName
  const sdkVersion = asString(sdk.version)
  if (sdkVersion) resource["sentry.sdk.version"] = sdkVersion
  const attrs: Record<string, Json> = {}
  if (op) attrs["sentry.op"] = op
  overlayHttp(attrs, data, asRecord(span), {}, asString(span.name))

  return record({
    traceId,
    spanId,
    parentSpanId: optionalSpanId(span.parent_span_id),
    name,
    kind: spanKind(op),
    startTimeNs: start,
    endTimeNs: end,
    statusCode: status.code,
    statusMessage: status.message,
    serviceName: service,
    resourceAttributes: resource,
    scopeName: sdkName,
    scopeVersion: sdkVersion,
    scopeAttributes: {},
    attributes: attrs,
  })
}
