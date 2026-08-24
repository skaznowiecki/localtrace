import type { Db } from "@shared/db"
import { card } from "../helpers/card"
import { requireTrace } from "../helpers/require-trace"
import { spanOverviewDto } from "../helpers/span-dto"
import type { TraceOverviewDto } from "../types/dto"

export async function execute(
  db: Db,
  traceId: string,
): Promise<TraceOverviewDto> {
  const result = await requireTrace(db, traceId)
  const spans = result.spans.map((record) =>
    spanOverviewDto(record, result.trace.startTimeNs),
  )
  const byType: Record<string, number> = {}
  let errors = 0
  for (const span of spans) {
    if (span.status === "error") errors += 1
    const type = span.type ?? "unknown"
    byType[type] = (byType[type] ?? 0) + 1
  }

  const hints: string[] = []
  if (result.trace.breakdown == null) {
    hints.push("breakdown is null (still processing) — retry get_trace shortly")
  }
  if (errors > 0) {
    hints.push(
      `${errors} error span(s) — use get_span or get_trace_spans type=error`,
    )
  }
  if ((byType.sql ?? 0) + (byType.postgres ?? 0) + (byType.mysql ?? 0) + (byType.sqlite ?? 0) + (byType.clickhouse ?? 0) > 0) {
    hints.push("SQL spans present — use get_trace_sql or get_trace_spans type=sql")
  }
  if ((byType.http ?? 0) + (byType.express ?? 0) > 0) {
    hints.push("HTTP spans present — use get_trace_spans type=http")
  }
  if ((byType.trpc ?? 0) > 0) {
    hints.push("tRPC spans present — use get_trace_spans type=trpc")
  }
  hints.push("Call get_span for attributes; do not request detail=full unless needed")

  return {
    trace: card(result.trace),
    spans,
    counts: { spans: spans.length, errors, by_type: byType },
    hints,
  }
}
