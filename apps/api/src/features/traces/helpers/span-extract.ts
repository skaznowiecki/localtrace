import { nsToRfc3339, readAttr } from "@shared/helpers"
import { overlayAttributes } from "@features/ingest/providers/overlay"
import { peerHost, urlHit } from "./span-type/host"
import {
  classify,
  dbSystem,
  statementHit,
} from "./span-type"
import { spanStatus } from "./span-dto"
import type { TypedSpanDto } from "../types/dto"
import type { SpanRecord } from "../types/span"

export const SPAN_EXTRACT_TYPES = [
  "sql",
  "redis",
  "mongo",
  "prisma",
  "http",
  "express",
  "s3",
  "openrouter",
  "trpc",
  "error",
] as const

export type SpanExtractType = (typeof SPAN_EXTRACT_TYPES)[number]

const SQL_TYPES = new Set(["sql", "postgres", "mysql", "sqlite", "clickhouse"])

function startOffsetMs(record: SpanRecord, traceStartNs: bigint): number {
  const startOffsetNs =
    record.startTimeNs > traceStartNs ? record.startTimeNs - traceStartNs : 0n
  return Number(startOffsetNs) / 1_000_000
}

export function classifiedType(record: SpanRecord): string | undefined {
  const attrs = overlayAttributes(record.ingestProvider, record.attributes)
  return classify({ name: record.name, attributes: attrs })?.type
}

export function matchesExtractType(
  record: SpanRecord,
  type: SpanExtractType,
): boolean {
  if (type === "error") return record.statusCode === 2
  const spanType = classifiedType(record)
  if (type === "sql") return spanType != null && SQL_TYPES.has(spanType)
  return spanType === type
}

function base(
  record: SpanRecord,
  traceStartNs: bigint,
  type: string,
  payload: Record<string, unknown>,
  payloadPath?: string,
): TypedSpanDto {
  return {
    span_id: record.spanId,
    trace_id: record.traceId,
    name: record.name,
    type,
    service: record.serviceName || "unknown_service",
    status: spanStatus(record.statusCode),
    duration_ms: Number(record.durationNs) / 1_000_000,
    start_offset_ms: startOffsetMs(record, traceStartNs),
    payload_path: payloadPath,
    payload,
  }
}

export function extractTypedSpan(
  record: SpanRecord,
  traceStartNs: bigint,
  type: SpanExtractType,
): TypedSpanDto | null {
  if (!matchesExtractType(record, type)) return null
  const attrs = overlayAttributes(record.ingestProvider, record.attributes)
  const classified = classify({ name: record.name, attributes: attrs })
  const spanType = classified?.type ?? type
  const path = classified?.payloadPath

  if (type === "sql") {
    const hit = statementHit(attrs)
    const operation = readAttr(attrs, ["db.operation"])
    const statement =
      hit?.value ??
      (operation && record.name && record.name.toUpperCase() !== operation.toUpperCase()
        ? `${operation} ${record.name}`
        : operation || record.name)
    return base(
      record,
      traceStartNs,
      spanType,
      {
        statement,
        db_system: dbSystem(attrs) ?? null,
        host:
          readAttr(attrs, [
            "server.address",
            "peer.hostname",
            "net.peer.name",
            "peer.service",
            "db.name",
          ]) ?? null,
        started_at: nsToRfc3339(record.startTimeNs),
      },
      path,
    )
  }

  if (type === "http" || type === "express") {
    return base(
      record,
      traceStartNs,
      spanType,
      {
        method: readAttr(attrs, ["http.request.method", "http.method"]),
        status_code: readAttr(attrs, [
          "http.response.status_code",
          "http.status_code",
        ]),
        url: readAttr(attrs, ["url.full", "http.url"]),
        route: readAttr(attrs, ["http.route", "http.target", "url.path"]),
        host: peerHost(attrs),
      },
      path ?? urlHit(attrs)?.path,
    )
  }

  if (type === "redis" || type === "mongo") {
    return base(
      record,
      traceStartNs,
      spanType,
      {
        statement: statementHit(attrs)?.value ?? record.name,
        operation: readAttr(attrs, ["db.operation"]),
        db_system: dbSystem(attrs) ?? type,
      },
      path,
    )
  }

  if (type === "prisma") {
    return base(
      record,
      traceStartNs,
      spanType,
      { operation: readAttr(attrs, ["name"]) ?? record.name },
      path,
    )
  }

  if (type === "trpc") {
    return base(
      record,
      traceStartNs,
      spanType,
      {
        path:
          readAttr(attrs, ["trpc.path", "rpc.method"]) ?? record.name,
        procedure_type: readAttr(attrs, ["trpc.type"]) ?? null,
        status: readAttr(attrs, ["rpc.response.status_code"]) ?? null,
      },
      path,
    )
  }

  if (type === "s3" || type === "openrouter") {
    return base(
      record,
      traceStartNs,
      spanType,
      {
        url: readAttr(attrs, ["url.full", "http.url"]),
        host: peerHost(attrs),
        method: readAttr(attrs, ["http.request.method", "http.method"]),
      },
      path,
    )
  }

  return base(
    record,
    traceStartNs,
    spanType,
    { status_message: record.statusMessage ?? null },
    path,
  )
}

export function typedSpan(
  record: SpanRecord,
  traceStartNs: bigint,
  type?: SpanExtractType,
): TypedSpanDto | null {
  if (type) return extractTypedSpan(record, traceStartNs, type)
  for (const candidate of SPAN_EXTRACT_TYPES) {
    const item = extractTypedSpan(record, traceStartNs, candidate)
    if (item) return item
  }
  const spanType = classifiedType(record) ?? "span"
  return base(record, traceStartNs, spanType, {
    started_at: nsToRfc3339(record.startTimeNs),
  })
}
