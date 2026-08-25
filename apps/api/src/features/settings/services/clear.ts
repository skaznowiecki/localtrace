import type { Db } from "@shared/db"
import * as repo from "../repositories/settings"

export async function execute(db: Db): Promise<{ ok: true }> {
  await db.run((conn) => repo.clearTelemetry(conn))
  await db.run(async (conn) => {
    await conn.run("VACUUM")
  })
  return { ok: true }
}
