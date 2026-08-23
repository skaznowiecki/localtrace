import type { Json } from "@shared/helpers"
import type { LogRecord } from "@features/logs/types/log"
import { optionalSpanId, optionalTraceId } from "../helpers/ids"
import { unixSecondsToNs } from "../helpers/time"
import {
  asList,
  asRecord,
  asString,
  flattenAttributes,
  resourceAttributes,
  scopeFromSdk,
  serviceName,
  toJson,
} from "../helpers/values"

const SEVERITY: Record<string, number> = {
  fatal: 21,
  critical: 21,
  error: 17,
  warning: 13,
  warn: 13,
  info: 9,
  log: 9,
  debug: 5,
  trace: 1,
}

const MAX_FRAMES = 30
const MAX_BREADCRUMBS = 20

function eventMessage(event: Record<string, unknown>): string {
  const exception = asRecord(event.exception)
  const first = asList(exception.values)[0]
  if (first) {
    const type = asString(first.type)
    const value = asString(first.value)
    if (type && value) return `${type}: ${value}`
    return type ?? value ?? ""
  }
  const logentry = asRecord(event.logentry)
  return (
    asString(logentry.formatted) ??
    asString(event.message) ??
    asString(asRecord(event.message).formatted) ??
    ""
  )
}

function exceptionAttributes(event: Record<string, unknown>): Json {
  const values = asList(asRecord(event.exception).values)
  if (values.length === 0) return null
  return values.map((item) => {
    const frames = asList(asRecord(item.stacktrace).frames).slice(-MAX_FRAMES)
    return {
      type: asString(item.type) ?? null,
      value: asString(item.value) ?? null,
      frames: frames.map((frame) => ({
        filename: asString(frame.filename) ?? asString(frame.abs_path) ?? null,
        function: asString(frame.function) ?? null,
        lineno: typeof frame.lineno === "number" ? frame.lineno : null,
        colno: typeof frame.colno === "number" ? frame.colno : null,
      })),
    }
  })
}

function breadcrumbAttributes(event: Record<string, unknown>): Json {
  const values = asList(asRecord(event.breadcrumbs).values).slice(-MAX_BREADCRUMBS)
  if (values.length === 0) {
    const direct = asList(event.breadcrumbs).slice(-MAX_BREADCRUMBS)
    if (direct.length === 0) return null
    return toJson(direct)
  }
  return toJson(values)
}

export function mapEvent(event: Record<string, unknown>): LogRecord {
  const body = eventMessage(event)
  const level = asString(event.level)?.toLowerCase()
  const exception = asList(asRecord(event.exception).values)[0]
  const request = asRecord(event.request)
  const user = asRecord(event.user)
  const trace = asRecord(asRecord(event.contexts).trace)
  const eventId = asString(event.event_id)?.replace(/-/g, "")
  const scope = scopeFromSdk(event)

  const attributes: Record<string, Json> = {}
  if (eventId) attributes["sentry.event_id"] = eventId
  const transaction = asString(event.transaction)
  if (transaction) attributes.transaction = transaction
  const culprit = asString(event.culprit)
  if (culprit) attributes.culprit = culprit
  const method = asString(request.method)
  if (method) attributes["http.method"] = method.toUpperCase()
  const url = asString(request.url)
  if (url) attributes["http.url"] = url
  const userId = asString(user.id)
  if (userId) attributes["user.id"] = userId
  const email = asString(user.email)
  if (email) attributes["user.email"] = email
  const tags = asRecord(event.tags)
  if (Object.keys(tags).length > 0) attributes.tags = toJson(tags)
  const exceptionAttr = exceptionAttributes(event)
  if (exceptionAttr) attributes.exception = exceptionAttr
  const breadcrumbs = breadcrumbAttributes(event)
  if (breadcrumbs) attributes.breadcrumbs = breadcrumbs

  return {
    id: crypto.randomUUID(),
    timeNs: unixSecondsToNs(event.timestamp),
    severityNumber: level ? SEVERITY[level] : undefined,
    severityText: level,
    bodyAny: body || undefined,
    eventName: asString(exception?.type) ?? "sentry.event",
    serviceName: serviceName(event),
    resourceAttributes: resourceAttributes(event),
    resourceDroppedAttributesCount: 0,
    scopeName: scope.name,
    scopeVersion: scope.version,
    scopeAttributes: {},
    scopeDroppedAttributesCount: 0,
    attributes,
    droppedAttributesCount: 0,
    flags: 0,
    traceId: optionalTraceId(trace.trace_id),
    spanId: optionalSpanId(trace.span_id),
  }
}

function logBody(value: unknown): string {
  if (typeof value === "string") return value
  const rec = asRecord(value)
  return (
    asString(rec.__sentry_template_string__) ??
    asString(rec.formatted) ??
    (value == null ? "" : JSON.stringify(value))
  )
}

export function mapLogItems(
  payload: Record<string, unknown>,
  envelopeHeader: Record<string, unknown> = {},
): LogRecord[] {
  const items = Array.isArray(payload.items)
    ? (payload.items as unknown[])
    : payload.timestamp != null || payload.body != null
      ? [payload]
      : []

  const out: LogRecord[] = []
  for (const item of items) {
    if (!item || typeof item !== "object") continue
    const mapped = mapSerializedLog(
      item as Record<string, unknown>,
      envelopeHeader,
    )
    if (mapped) out.push(mapped)
  }
  return out
}

function mapSerializedLog(
  item: Record<string, unknown>,
  envelopeHeader: Record<string, unknown>,
): LogRecord | undefined {
  const body = logBody(item.body ?? item.message)
  const level = asString(item.level)?.toLowerCase()
  const data = flattenAttributes(asRecord(item.attributes))
  const sdk = asRecord(envelopeHeader.sdk)
  const service =
    asString(data["service.name"]) ??
    asString(data["sentry.sdk.name"]) ??
    asString(sdk.name) ??
    "sentry"

  const attributes: Record<string, Json> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue
    attributes[key] = toJson(value)
  }

  return {
    id: crypto.randomUUID(),
    timeNs: unixSecondsToNs(item.timestamp),
    severityNumber:
      typeof item.severity_number === "number"
        ? item.severity_number
        : level
          ? SEVERITY[level]
          : undefined,
    severityText: level,
    bodyAny: body || undefined,
    eventName: "sentry.log",
    serviceName: service,
    resourceAttributes: { "service.name": service },
    resourceDroppedAttributesCount: 0,
    scopeName: asString(sdk.name) ?? asString(data["sentry.sdk.name"]),
    scopeVersion:
      asString(sdk.version) ?? asString(data["sentry.sdk.version"]),
    scopeAttributes: {},
    scopeDroppedAttributesCount: 0,
    attributes,
    droppedAttributesCount: 0,
    flags: 0,
    traceId: optionalTraceId(item.trace_id ?? data["sentry.trace_id"]),
    spanId: optionalSpanId(
      item.span_id ?? data["sentry.trace.parent_span_id"],
    ),
  }
}
