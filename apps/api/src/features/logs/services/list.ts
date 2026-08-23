import type { Db } from "@shared/db"
import { dto } from "../helpers/dto"
import * as repo from "../repositories/logs"
import type { LogDto, LogListFilters } from "../types/log"

export async function execute(
  db: Db,
  filters: LogListFilters,
): Promise<LogDto[]> {
  const logs = await db.run((conn) => repo.list(conn, filters))
  return logs.map(dto)
}
