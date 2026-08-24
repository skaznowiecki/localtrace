import type { Db } from "@shared/db"
import * as repo from "../repositories/traces"
import type { TraceListFilters } from "../types/span"

export async function execute(
  db: Db,
  filters: TraceListFilters,
): Promise<number> {
  return db.run((conn) => repo.count(conn, filters))
}
