import type { Db } from "../../../shared/db"
import type { ServiceCard } from "../types/service"
import * as repo from "../repositories/catalog"

export async function list(db: Db): Promise<ServiceCard[]> {
  return db.run((conn) => repo.listServices(conn))
}
