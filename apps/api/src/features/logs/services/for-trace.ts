import type { Db } from "@shared/db"
import { dto } from "../helpers/dto"
import * as repo from "../repositories/logs"
import type { LogDto } from "../types/log"

export async function execute(db: Db, traceId: string): Promise<LogDto[]> {
  const logs = await db.run((conn) => repo.forTrace(conn, traceId))
  return logs.map(dto)
}
