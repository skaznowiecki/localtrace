import type { Db } from "@shared/db"
import * as repo from "../repositories/logs"
import type { LogFacetsDto } from "../types/log"

export async function execute(db: Db): Promise<LogFacetsDto> {
  return db.run((conn) => repo.facets(conn))
}
