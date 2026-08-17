import { nestDottedKeys } from "../../../lib/attrs"
import type { LogDto, LogRecord } from "../types/log"

function nsToRfc3339(ns: bigint): string {
  const secs = ns / 1_000_000_000n
  const nanos = ns % 1_000_000_000n
  const date = new Date(Number(secs) * 1000)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  const iso = date.toISOString()
  const pad = nanos.toString().padStart(9, "0")
  return iso.replace(/\.\d{3}Z$/, `.${pad}Z`)
}

export function logDto(log: LogRecord): LogDto {
  return {
    id: log.id,
    time: nsToRfc3339(log.timeNs),
    severity_number: log.severityNumber ?? null,
    severity_text: log.severityText ?? null,
    body: log.bodyAny ?? null,
    service_name: log.serviceName || "unknown_service",
    attributes: nestDottedKeys(log.attributes ?? {}),
    scope_name: log.scopeName ?? null,
    scope_version: log.scopeVersion ?? null,
    trace_id: log.traceId ?? null,
    span_id: log.spanId ?? null,
  }
}
