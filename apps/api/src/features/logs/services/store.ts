import type { Db } from "@shared/db"
import type { LogRecord } from "../types/log"
import * as repo from "../repositories/logs"

export async function execute(db: Db, logs: LogRecord[]): Promise<void> {
  if (logs.length === 0) return
  await db.run(async (conn) => {
    await conn.run("BEGIN")
    try {
      await repo.bulkCreate(conn, logs)
      await conn.run("COMMIT")
    } catch (err) {
      try {
        await conn.run("ROLLBACK")
      } catch {
        // ignore
      }
      throw err
    }
  })
}
