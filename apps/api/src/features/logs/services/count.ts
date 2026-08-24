import type { Db } from "@shared/db"
import * as repo from "../repositories/logs"
import type { LogListFilters } from "../types/log"

export async function execute(
  db: Db,
  filters: LogListFilters,
): Promise<number> {
  return db.run((conn) => repo.count(conn, filters))
}
