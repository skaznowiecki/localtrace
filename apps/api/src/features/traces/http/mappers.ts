import { nestDottedKeys } from "../../../lib/attrs"
import type { Json } from "../../../lib/attrs"
import type { SpanRecord, TraceFacets, TraceSummary } from "../types/span"
import type {
  SpanDto,
  TraceCardDto,
  TraceDetailDto,
  TraceFacetsDto,
} from "../types/dto"

function nsToRfc3339(ns: bigint): string {
  const secs = ns / 1_000_000_000n
  const nanos = ns % 1_000_000_000n
  const date = new Date(Number(secs) * 1000)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  const iso = date.toISOString()
  const pad = nanos.toString().padStart(9, "0")
  return iso.replace(/\.\d{3}Z$/, `.${pad}Z`)
}

function spanStatus(statusCode: number): string {
  if (statusCode === 2) return "error"
  if (statusCode === 1) return "ok"
  return "unset"
}

export function traceCard(trace: TraceSummary): TraceCardDto {
  const dto: TraceCardDto = {
    id: trace.traceId,
    service: trace.rootService || "unknown_service",
    root_service: trace.rootService || "unknown_service",
    name: trace.rootName || "unknown",
    duration_ms: Number(trace.durationNs / 1_000_000n),
    span_count: trace.spanCount,
    status: trace.status,
    start_time: nsToRfc3339(trace.startTimeNs),
  }
  if (trace.httpStatusCode != null) dto.http_status_code = trace.httpStatusCode
  if (trace.httpUrl) dto.http_url = trace.httpUrl
  return dto
}

export function traceFacetsDto(facets: TraceFacets): TraceFacetsDto {
  return {
    services: facets.services,
    statuses: facets.statuses,
    methods: facets.methods,
    http_status_codes: facets.httpStatusCodes,
    routes: facets.routes,
  }
}

export function spanDto(span: SpanRecord, traceStartNs: bigint): SpanDto {
  const startOffsetNs =
    span.startTimeNs > traceStartNs ? span.startTimeNs - traceStartNs : 0n
  return {
    id: span.spanId,
    parent_id: span.parentSpanId ?? null,
    name: span.name,
    service: span.serviceName || "unknown_service",
    kind: span.kind,
    status: spanStatus(span.statusCode),
    status_message: span.statusMessage ?? null,
    start_offset_ms: Number(startOffsetNs) / 1_000_000,
    duration_ms: Number(span.durationNs) / 1_000_000,
    attributes: nestDottedKeys(span.attributes ?? {}),
    events: nestDottedKeys(span.events ?? []),
    links: nestDottedKeys(span.links ?? []),
    resource_attributes: nestDottedKeys(span.resourceAttributes ?? {}),
    scope_name: span.scopeName ?? null,
    scope_version: span.scopeVersion ?? null,
  }
}

export function traceDetail(
  trace: TraceSummary,
  spans: SpanRecord[],
): TraceDetailDto {
  return {
    trace: traceCard(trace),
    spans: spans.map((span) => spanDto(span, trace.startTimeNs)),
  }
}

export type { Json }
