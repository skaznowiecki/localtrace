import type { Config } from "@/config"
import type { Db } from "@shared/db"
import { endpoints } from "../helpers/endpoints"
import {
  parseRetentionHours,
  RETENTION_KEY,
} from "../helpers/retention"
import * as repo from "../repositories/settings"
import type { RetentionHours, SettingsDto } from "../types/dto"

export async function readRetentionHours(
  db: Db,
  fallback: RetentionHours,
): Promise<RetentionHours> {
  return db.run(async (conn) => {
    const stored = await repo.get(conn, RETENTION_KEY)
    if (stored != null) return parseRetentionHours(stored, fallback)
    await repo.set(conn, RETENTION_KEY, String(fallback))
    return fallback
  })
}

export async function execute(db: Db, config: Config): Promise<SettingsDto> {
  const retentionHours = await readRetentionHours(db, config.retentionHours)
  return {
    retentionHours,
    endpoints: endpoints(config.apiPort, config.grpcPort),
  }
}
