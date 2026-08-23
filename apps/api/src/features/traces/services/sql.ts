import type { Db } from "@shared/db"
import { NotFoundError } from "@shared/errors"
import { nsToRfc3339, overlayAttributes, readAttr } from "@shared/helpers"
import { dbSystem, isSqlSystem, statementHit } from "../helpers/span-type"
import * as repo from "../repositories/traces"
import type { SqlQueryDto } from "../types/dto"
import type { SpanRecord } from "../types/span"

function spanStatus(statusCode: number): string {
  if (statusCode === 2) return "error"
  if (statusCode === 1) return "ok"
  return "unset"
}

function statementText(
  attrs: ReturnType<typeof overlayAttributes>,
  name: string,
): string | null {
  const hit = statementHit(attrs)?.value
  if (hit) return hit
  if (!isSqlSystem(dbSystem(attrs))) return null
  const operation = readAttr(attrs, ["db.operation"])
  if (operation && name && name.toUpperCase() !== operation.toUpperCase()) {
    return `${operation} ${name}`
  }
  return operation || name || null
}

function query(
  record: SpanRecord,
  traceStartNs: bigint,
): Omit<SqlQueryDto, "share"> | null {
  const attrs = overlayAttributes(record.ingestProvider, record.attributes)
  const system = dbSystem(attrs)
  if (system && !isSqlSystem(system)) return null
  const text = statementText(attrs, record.name)
  if (!text) return null

  const startOffsetNs =
    record.startTimeNs > traceStartNs ? record.startTimeNs - traceStartNs : 0n

  return {
    span_id: record.spanId,
    name: record.name,
    statement: text,
    duration_ms: Number(record.durationNs) / 1_000_000,
    start_offset_ms: Number(startOffsetNs) / 1_000_000,
    started_at: nsToRfc3339(record.startTimeNs),
    db_system: system ?? null,
    host:
      readAttr(attrs, [
        "server.address",
        "peer.hostname",
        "net.peer.name",
        "peer.service",
        "db.name",
      ]) ?? null,
    status: spanStatus(record.statusCode),
  }
}

export async function execute(db: Db, traceId: string): Promise<SqlQueryDto[]> {
  const result = await db.run((conn) => repo.get(conn, traceId))
  if (!result) throw new NotFoundError(`trace ${traceId} not found`)

  const entries: Omit<SqlQueryDto, "share">[] = []
  for (const record of result.spans) {
    const entry = query(record, result.trace.startTimeNs)
    if (entry) entries.push(entry)
  }

  entries.sort((a, b) => b.duration_ms - a.duration_ms)
  const maxDuration = entries[0]?.duration_ms ?? 0

  return entries.map((entry) => ({
    ...entry,
    share: maxDuration > 0 ? entry.duration_ms / maxDuration : 0,
  }))
}
