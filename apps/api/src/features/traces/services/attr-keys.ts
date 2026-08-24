import type { Db } from "@shared/db"
import * as repo from "../repositories/traces"
import type { AttrKeysDto } from "../types/dto"

export async function execute(db: Db): Promise<AttrKeysDto> {
  const keys = await db.run((conn) => repo.attrKeys(conn))
  return { keys }
}
