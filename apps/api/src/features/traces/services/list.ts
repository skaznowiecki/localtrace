import type { Db } from "@shared/db"
import { card } from "../helpers/card"
import * as repo from "../repositories/traces"
import type { TraceCardDto } from "../types/dto"
import type { TraceListFilters } from "../types/span"

export async function execute(
  db: Db,
  filters: TraceListFilters,
): Promise<TraceCardDto[]> {
  const traces = await db.run((conn) => repo.list(conn, filters))
  return traces.map(card)
}
