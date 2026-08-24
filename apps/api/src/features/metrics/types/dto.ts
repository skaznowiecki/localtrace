export type MetricFacetsDto = {
  names: { name: string; count: number }[]
  services: { service: string; count: number }[]
}

export type MetricPointDto = {
  time: string
  name: string
  service: string
  value: number | null
  count: number | null
  sum: number | null
}
