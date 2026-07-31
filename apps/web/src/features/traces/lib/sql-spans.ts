import type { Span, TraceStatus } from "../types"
import { readAttr } from "./span-attributes"

export type SqlQueryEntry = {
  spanId: string
  name: string
  statement: string
  durationMs: number
  startOffsetMs: number
  /** Absolute start time ISO, when trace start is known. */
  startedAt: string | null
  dbSystem: string | null
  host: string | null
  status: TraceStatus
  /** Share of duration vs the slowest query in the list (0–1). */
  share: number
}

function extractStatement(span: Span): string | null {
  return readAttr(span.attributes, "db.statement", "db.query.text")
}

export function collectSqlQueries(
  spans: Span[],
  traceStartTime?: string | null,
): SqlQueryEntry[] {
  const traceStartMs = traceStartTime
    ? new Date(traceStartTime).getTime()
    : Number.NaN
  const hasTraceStart = Number.isFinite(traceStartMs)

  const entries: Omit<SqlQueryEntry, "share">[] = []

  for (const span of spans) {
    const statement = extractStatement(span)
    if (!statement) continue

    entries.push({
      spanId: span.id,
      name: span.name,
      statement,
      durationMs: span.durationMs,
      startOffsetMs: span.startOffsetMs,
      startedAt: hasTraceStart
        ? new Date(traceStartMs + span.startOffsetMs).toISOString()
        : null,
      dbSystem: readAttr(span.attributes, "db.system"),
      host: readAttr(
        span.attributes,
        "server.address",
        "net.peer.name",
        "peer.service",
        "db.name",
      ),
      status: span.status,
    })
  }

  entries.sort((a, b) => b.durationMs - a.durationMs)

  const maxDuration = entries[0]?.durationMs ?? 0

  return entries.map((entry) => ({
    ...entry,
    share: maxDuration > 0 ? entry.durationMs / maxDuration : 0,
  }))
}
