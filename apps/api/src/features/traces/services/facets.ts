import type { Db } from "../../../shared/db"
import * as repo from "../repositories/traces"
import type { TraceFacetsDto } from "../types/dto"
import type { TraceFacets } from "../types/span"

function dto(value: TraceFacets): TraceFacetsDto {
  return {
    services: value.services,
    statuses: value.statuses,
    methods: value.methods,
    http_status_codes: value.httpStatusCodes,
    routes: value.routes,
  }
}

export async function execute(db: Db): Promise<TraceFacetsDto> {
  return dto(await db.run((conn) => repo.facets(conn)))
}
