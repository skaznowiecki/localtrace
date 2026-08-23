import { nestDottedKeys, nsToRfc3339 } from "@shared/helpers"
import type { LogDto, LogRecord } from "../types/log"

export function dto(log: LogRecord): LogDto {
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
