import { nestDottedKeys, nsToRfc3339 } from "@shared/helpers"
import { overlayAttributes } from "@features/ingest/providers/overlay"
import type { LogDto, LogRecord } from "../types/log"

export function dto(log: LogRecord, raw = false): LogDto {
  const attrs = raw
    ? (log.attributes ?? {})
    : overlayAttributes(log.ingestProvider, log.attributes)
  return {
    id: log.id,
    time: nsToRfc3339(log.timeNs),
    severity_number: log.severityNumber ?? null,
    severity_text: log.severityText ?? null,
    body: log.bodyAny ?? null,
    service_name: log.serviceName || "unknown_service",
    attributes: nestDottedKeys(attrs),
    scope_name: log.scopeName ?? null,
    scope_version: log.scopeVersion ?? null,
    trace_id: log.traceId ?? null,
    span_id: log.spanId ?? null,
    provider: log.ingestProvider ?? "otlp",
  }
}
