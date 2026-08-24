import type { Db } from "@shared/db"
import { BadRequestError, NotFoundError } from "@shared/errors"
import { spanDtoTruncated } from "../helpers/span-dto"
import * as repo from "../repositories/traces"
import type { SpanDto } from "../types/dto"

export async function execute(
  db: Db,
  spanId: string,
  traceId?: string,
  raw = false,
): Promise<SpanDto> {
  const spans = await db.run((conn) => repo.findSpans(conn, spanId, traceId))
  if (spans.length === 0) {
    const ids = await db.run((conn) => repo.recentIds(conn, 3))
    const hint = ids.length > 0 ? ` recent traces: ${ids.join(", ")}` : ""
    throw new NotFoundError(
      `span ${spanId} not found${traceId ? ` in trace ${traceId}` : ""}.${hint}`,
    )
  }
  if (spans.length > 1 && !traceId) {
    const ids = [...new Set(spans.map((span) => span.traceId))]
    throw new BadRequestError(
      `span ${spanId} matches multiple traces (${ids.join(", ")}); pass trace_id`,
    )
  }
  const record = spans[0]!
  const result = await db.run((conn) => repo.get(conn, record.traceId))
  const traceStartNs = result?.trace.startTimeNs ?? record.startTimeNs
  return spanDtoTruncated(record, traceStartNs, raw)
}
