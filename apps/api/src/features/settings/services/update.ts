import type { Config } from "@/config"
import type { Db } from "@shared/db"
import type { z } from "zod"
import { endpoints } from "../helpers/endpoints"
import { RETENTION_KEY } from "../helpers/retention"
import * as repo from "../repositories/settings"
import type { body } from "../schemas/update"
import type { SettingsDto } from "../types/dto"

export async function execute(
  db: Db,
  config: Config,
  input: z.infer<typeof body>,
): Promise<SettingsDto> {
  await db.run((conn) => repo.set(conn, RETENTION_KEY, String(input.retentionHours)))
  return {
    retentionHours: input.retentionHours,
    endpoints: endpoints(config.apiPort, config.grpcPort),
  }
}
