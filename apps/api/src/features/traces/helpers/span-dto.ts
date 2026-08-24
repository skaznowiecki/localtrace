import { nestDottedKeys, truncateJson } from "@shared/helpers"
import { overlayAttributes } from "@features/ingest/providers/overlay"
import { classify } from "./span-type"
import type { SpanDto, SpanOverviewDto } from "../types/dto"
import type { SpanRecord } from "../types/span"

export function spanStatus(statusCode: number): string {
  if (statusCode === 2) return "error"
  if (statusCode === 1) return "ok"
  return "unset"
}

function startOffsetMs(record: SpanRecord, traceStartNs: bigint): number {
  const startOffsetNs =
    record.startTimeNs > traceStartNs ? record.startTimeNs - traceStartNs : 0n
  return Number(startOffsetNs) / 1_000_000
}

export function spanDto(
  record: SpanRecord,
  traceStartNs: bigint,
  raw = false,
): SpanDto {
  const attrs = raw
    ? (record.attributes ?? {})
    : overlayAttributes(record.ingestProvider, record.attributes)
  const classified = raw
    ? undefined
    : classify({ name: record.name, attributes: attrs })
  return {
    id: record.spanId,
    parent_id: record.parentSpanId ?? null,
    name: record.name,
    service: record.serviceName || "unknown_service",
    kind: record.kind,
    status: spanStatus(record.statusCode),
    status_message: record.statusMessage ?? null,
    start_offset_ms: startOffsetMs(record, traceStartNs),
    duration_ms: Number(record.durationNs) / 1_000_000,
    attributes: nestDottedKeys(attrs),
    events: nestDottedKeys(record.events ?? []),
    links: nestDottedKeys(record.links ?? []),
    resource_attributes: nestDottedKeys(record.resourceAttributes ?? {}),
    scope_name: record.scopeName ?? null,
    scope_version: record.scopeVersion ?? null,
    type: classified?.type,
    payload_path: classified?.payloadPath,
    provider: record.ingestProvider ?? "otlp",
  }
}

export function spanOverviewDto(
  record: SpanRecord,
  traceStartNs: bigint,
): SpanOverviewDto {
  const attrs = overlayAttributes(record.ingestProvider, record.attributes)
  const classified = classify({ name: record.name, attributes: attrs })
  return {
    id: record.spanId,
    parent_id: record.parentSpanId ?? null,
    name: record.name,
    service: record.serviceName || "unknown_service",
    type: classified?.type,
    status: spanStatus(record.statusCode),
    start_offset_ms: startOffsetMs(record, traceStartNs),
    duration_ms: Number(record.durationNs) / 1_000_000,
    payload_path: classified?.payloadPath,
  }
}

export function spanDtoTruncated(
  record: SpanRecord,
  traceStartNs: bigint,
  raw = false,
): SpanDto {
  const dto = spanDto(record, traceStartNs, raw)
  return {
    ...dto,
    attributes: truncateJson(dto.attributes) as SpanDto["attributes"],
    events: truncateJson(dto.events) as SpanDto["events"],
    links: truncateJson(dto.links) as SpanDto["links"],
    resource_attributes: truncateJson(
      dto.resource_attributes,
    ) as SpanDto["resource_attributes"],
  }
}
