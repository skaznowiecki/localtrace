import type { Db } from "@shared/db"
import { card } from "../helpers/card"
import { requireTrace } from "../helpers/require-trace"
import { spanDto } from "../helpers/span-dto"
import type { TraceDetailDto } from "../types/dto"

export async function execute(
  db: Db,
  traceId: string,
  raw = false,
): Promise<TraceDetailDto> {
  const result = await requireTrace(db, traceId)
  return {
    trace: card(result.trace),
    spans: result.spans.map((record) =>
      spanDto(record, result.trace.startTimeNs, raw),
    ),
  }
}
