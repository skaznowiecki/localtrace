import type { Db } from "@shared/db"
import { NotFoundError } from "@shared/errors"
import { nestDottedKeys, overlayAttributes } from "@shared/helpers"
import { card } from "../helpers/card"
import { classify } from "../helpers/span-type"
import * as repo from "../repositories/traces"
import type { SpanDto, TraceDetailDto } from "../types/dto"
import type { SpanRecord, TraceSummary } from "../types/span"

function spanStatus(statusCode: number): string {
  if (statusCode === 2) return "error"
  if (statusCode === 1) return "ok"
  return "unset"
}

function span(record: SpanRecord, traceStartNs: bigint, raw: boolean): SpanDto {
  const startOffsetNs =
    record.startTimeNs > traceStartNs ? record.startTimeNs - traceStartNs : 0n
  const attrs = raw
    ? (record.attributes ?? {})
    : overlayAttributes(record.ingestProvider, record.attributes)
  const classified = raw
    ? undefined
    : classify({
        name: record.name,
        attributes: attrs,
      })
  return {
    id: record.spanId,
    parent_id: record.parentSpanId ?? null,
    name: record.name,
    service: record.serviceName || "unknown_service",
    kind: record.kind,
    status: spanStatus(record.statusCode),
    status_message: record.statusMessage ?? null,
    start_offset_ms: Number(startOffsetNs) / 1_000_000,
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

function detail(
  trace: TraceSummary,
  spans: SpanRecord[],
  raw: boolean,
): TraceDetailDto {
  return {
    trace: card(trace),
    spans: spans.map((record) => span(record, trace.startTimeNs, raw)),
  }
}

export async function execute(
  db: Db,
  traceId: string,
  raw = false,
): Promise<TraceDetailDto> {
  const result = await db.run((conn) => repo.get(conn, traceId))
  if (!result) throw new NotFoundError(`trace ${traceId} not found`)
  return detail(result.trace, result.spans, raw)
}
