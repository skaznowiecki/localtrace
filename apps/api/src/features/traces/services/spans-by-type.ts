import type { Db } from "@shared/db"
import { requireTrace } from "../helpers/require-trace"
import {
  extractTypedSpan,
  type SpanExtractType,
} from "../helpers/span-extract"
import type { TypedSpanDto } from "../types/dto"

export async function execute(
  db: Db,
  traceId: string,
  type: SpanExtractType,
): Promise<TypedSpanDto[]> {
  const result = await requireTrace(db, traceId)
  const items: TypedSpanDto[] = []
  for (const record of result.spans) {
    const item = extractTypedSpan(record, result.trace.startTimeNs, type)
    if (item) items.push(item)
  }
  items.sort((a, b) => b.duration_ms - a.duration_ms)
  return items
}
