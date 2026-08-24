import type { Db } from "@shared/db"
import { requireTrace } from "../helpers/require-trace"
import { extractTypedSpan } from "../helpers/span-extract"
import type { SqlQueryDto } from "../types/dto"

function payloadString(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  const value = payload[key]
  if (value == null) return null
  return String(value)
}

export async function execute(db: Db, traceId: string): Promise<SqlQueryDto[]> {
  const result = await requireTrace(db, traceId)
  const entries: Omit<SqlQueryDto, "share">[] = []
  for (const record of result.spans) {
    const extracted = extractTypedSpan(record, result.trace.startTimeNs, "sql")
    if (!extracted) continue
    entries.push({
      span_id: extracted.span_id,
      name: extracted.name,
      statement: payloadString(extracted.payload, "statement") ?? "",
      duration_ms: extracted.duration_ms,
      start_offset_ms: extracted.start_offset_ms,
      started_at: payloadString(extracted.payload, "started_at"),
      db_system: payloadString(extracted.payload, "db_system"),
      host: payloadString(extracted.payload, "host"),
      status: extracted.status,
    })
  }

  entries.sort((a, b) => b.duration_ms - a.duration_ms)
  const maxDuration = entries[0]?.duration_ms ?? 0

  return entries.map((entry) => ({
    ...entry,
    share: maxDuration > 0 ? entry.duration_ms / maxDuration : 0,
  }))
}
