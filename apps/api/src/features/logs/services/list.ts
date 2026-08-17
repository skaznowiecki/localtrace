import type { Db } from "../../../shared/db"
import type { LogRecord } from "../types/log"
import * as repo from "../repositories/logs"

export async function listForTrace(db: Db, traceId: string): Promise<LogRecord[]> {
  return db.run((conn) => repo.listForTrace(conn, traceId))
}
