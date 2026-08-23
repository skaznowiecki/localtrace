import type { Db } from "@shared/db"
import { NotFoundError } from "@shared/errors"
import { nsToRfc3339, readAttr } from "@shared/helpers"
import { dbSystem, statementHit } from "../helpers/span-type"
import * as repo from "../repositories/traces"
import type { SqlQueryDto } from "../types/dto"
import type { SpanRecord } from "../types/span"

function spanStatus(statusCode: number): string {
  if (statusCode === 2) return "error"
  if (statusCode === 1) return "ok"
  return "unset"
}

function query(
  record: SpanRecord,
  traceStartNs: bigint,
): Omit<SqlQueryDto, "share"> | null {
  const text = statementHit(record.attributes)?.value
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
    db_system: dbSystem(record.attributes) ?? null,
    host:
      readAttr(record.attributes, [
        "server.address",
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
