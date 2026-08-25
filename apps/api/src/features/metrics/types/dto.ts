export type MetricFacetsDto = {
  names: { name: string; count: number }[]
  services: { service: string; count: number }[]
}

export type MetricPointDto = {
  id: string
  time: string
  name: string
  service: string
  value: number | null
  count: number | null
  sum: number | null
}

export type MetricSortField = "date" | "name" | "service"
export type MetricSortOrder = "asc" | "desc"

export type MetricQueryFilters = {
  name?: string
  service?: string
  sinceNs?: bigint
  untilNs?: bigint
  limit: number
  offset: number
  sort: MetricSortField
  order: MetricSortOrder
}
