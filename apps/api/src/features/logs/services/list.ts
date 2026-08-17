import type { Db } from "../../../db/client"
import type { LogRecord } from "../types/log"
import * as repo from "../repositories/logs"

export async function listForTrace(db: Db, traceId: string): Promise<LogRecord[]> {
  return db.run((conn) => repo.listForTrace(conn, traceId))
}
