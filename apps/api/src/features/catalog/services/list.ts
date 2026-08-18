import type { Db } from "../../../shared/db"
import type { ServiceCard, ServiceCardDto } from "../types/service"
import * as repo from "../repositories/catalog"

function card(service: ServiceCard): ServiceCardDto {
  return { name: service.name, trace_count: service.traceCount }
}

export async function execute(db: Db): Promise<ServiceCardDto[]> {
  const services = await db.run((conn) => repo.list(conn))
  return services.map(card)
}
