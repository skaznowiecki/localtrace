import type { Json } from "@shared/helpers"
import type { LogRecord } from "@features/logs/types/log"
import { hexFromDdId } from "../helpers/ids"
import { unixToNs } from "../helpers/time"
import { asNumber, asRecord, asString, toJson } from "../helpers/values"

const SEVERITY: Record<string, number> = {
  emergency: 21,
  fatal: 21,
  alert: 21,
  critical: 21,
  error: 17,
  err: 17,
  warning: 13,
  warn: 13,
  notice: 9,
  info: 9,
  informational: 9,
  debug: 5,
  trace: 1,
}

export function mapLogs(items: unknown[]): LogRecord[] {
  return items.flatMap((item) => {
    const log = mapLog(asRecord(item))
    return log ? [log] : []
  })
}

function mapLog(item: Record<string, unknown>): LogRecord | undefined {
  const message =
    asString(item.message) ?? asString(item.msg) ?? asString(item.body)
  const service = asString(item.service) ?? "unnamed-service"
  const status = (asString(item.status) ?? asString(item.level) ?? "info").toLowerCase()
  const dd = asRecord(item.dd)
  const traceId =
    hexFromDdId(dd.trace_id ?? item["dd.trace_id"], 32) ??
    hexFromDdId(item.trace_id, 32)
  const spanId =
    hexFromDdId(dd.span_id ?? item["dd.span_id"], 16) ?? hexFromDdId(item.span_id, 16)

  const attributes: { [key: string]: Json } = {}
  for (const [key, value] of Object.entries(item)) {
    if (
      key === "message" ||
      key === "msg" ||
      key === "body" ||
      key === "service" ||
      key === "status" ||
      key === "level" ||
      key === "timestamp" ||
      key === "date"
    ) {
      continue
    }
    attributes[key] = toJson(value)
  }

  const hostname = asString(item.hostname) ?? asString(item.host)
  const resourceAttributes: { [key: string]: Json } = { "service.name": service }
  if (hostname) resourceAttributes["host.name"] = hostname

  return {
    id: crypto.randomUUID(),
    timeNs: unixToNs(item.timestamp ?? item.date) || BigInt(Date.now()) * 1_000_000n,
    severityNumber: SEVERITY[status] ?? asNumber(item.severity) ?? 9,
    severityText: status,
    bodyAny: message ?? toJson(item),
    serviceName: service,
    resourceAttributes,
    resourceDroppedAttributesCount: 0,
    scopeName: "datadog",
    scopeAttributes: {},
    scopeDroppedAttributesCount: 0,
    attributes,
    droppedAttributesCount: 0,
    flags: 0,
    traceId,
    spanId,
  }
}
