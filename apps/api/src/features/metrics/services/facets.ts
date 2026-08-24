import type { Db } from "@shared/db"
import * as repo from "../repositories/metrics"
import type { MetricFacetsDto } from "../types/dto"

export async function execute(db: Db): Promise<MetricFacetsDto> {
  return db.run(async (conn) => {
    const [names, services] = await Promise.all([
      repo.nameFacets(conn),
      repo.serviceFacets(conn),
    ])
    return { names, services }
  })
}
