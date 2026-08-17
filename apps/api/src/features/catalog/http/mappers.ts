import type { ServiceCard, ServiceCardDto } from "../types/service"

export function serviceCard(service: ServiceCard): ServiceCardDto {
  return { name: service.name, trace_count: service.traceCount }
}
