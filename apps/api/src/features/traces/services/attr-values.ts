import type { Db } from "@shared/db"
import * as repo from "../repositories/traces"
import type { AttrValuesDto } from "../types/dto"

export async function execute(
  db: Db,
  input: { key: string },
): Promise<AttrValuesDto> {
  const values = await db.run((conn) => repo.attrValues(conn, input.key))
  return { values }
}
