import type { Config } from "@/config"
import type { Db } from "@shared/db"
import { readRetentionHours } from "./get"
import * as repo from "../repositories/settings"

const HOUR_NS = 3_600_000_000_000n

export async function execute(db: Db, config: Config): Promise<void> {
  const hours = await readRetentionHours(db, config.retentionHours)
  const nowNs = BigInt(Date.now()) * 1_000_000n
  const cutoffNs = nowNs - BigInt(hours) * HOUR_NS
  await db.run((conn) => repo.pruneBefore(conn, cutoffNs))
}
