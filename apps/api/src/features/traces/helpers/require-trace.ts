import type { Db } from "@shared/db"
import { NotFoundError } from "@shared/errors"
import * as repo from "../repositories/traces"
import type { SpanRecord, TraceSummary } from "../types/span"

export async function requireTrace(
  db: Db,
  traceId: string,
): Promise<{ trace: TraceSummary; spans: SpanRecord[] }> {
  const result = await db.run((conn) => repo.get(conn, traceId))
  if (result) return result
  const ids = await db.run((conn) => repo.recentIds(conn, 3))
  const hint = ids.length > 0 ? ` recent ids: ${ids.join(", ")}` : ""
  throw new NotFoundError(`trace ${traceId} not found.${hint}`)
}
