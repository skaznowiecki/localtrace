import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { parseJson } from "@/lib/api"
import { LIST_PAGE_SIZE, nextPageOffset } from "@/lib/infinite-pages"

import {
  filtersToSearchParams,
  type LogQueryFilters,
} from "../lib/log-filter"
import type { JsonValue, LogListItem } from "../types"

type ApiLogDto = {
  id: string
  time: string
  severity_number: number | null
  severity_text: string | null
  body: JsonValue
  service_name: string
  attributes: JsonValue
  scope_name: string | null
  scope_version: string | null
  trace_id: string | null
  span_id: string | null
}

type ApiFacetValue = {
  value: string
  count: number
}

type ApiLogFacets = {
  services: ApiFacetValue[]
  severities: ApiFacetValue[]
}

export type FacetValue = {
  value: string
  count: number
}

export type LogFacets = {
  services: FacetValue[]
  severities: FacetValue[]
}

function mapLog(log: ApiLogDto): LogListItem {
  return {
    id: log.id,
    time: log.time,
    severityNumber: log.severity_number,
    severityText: log.severity_text,
    body: log.body ?? null,
    service: log.service_name,
    attributes: log.attributes ?? {},
    scopeName: log.scope_name,
    scopeVersion: log.scope_version,
    traceId: log.trace_id,
    spanId: log.span_id,
  }
}

export async function fetchLogs(
  filters: LogQueryFilters = {},
  limit = LIST_PAGE_SIZE,
  offset = 0,
): Promise<LogListItem[]> {
  const params = filtersToSearchParams(filters, limit, offset)
  const response = await fetch(`/api/logs?${params.toString()}`)
  const logs = await parseJson<ApiLogDto[]>(response)
  return logs.map(mapLog)
}

export async function fetchLogFacets(): Promise<LogFacets> {
  const response = await fetch("/api/logs/facets")
  const facets = await parseJson<ApiLogFacets>(response)
  return {
    services: facets.services ?? [],
    severities: facets.severities ?? [],
  }
}

export type LogListLiveOptions = {
  live?: boolean
  lookbackMs?: number | null
}

export const logKeys = {
  all: ["logs"] as const,
  lists: () => [...logKeys.all, "list"] as const,
  list: (
    filters: LogQueryFilters,
    limit: number,
    liveOptions?: LogListLiveOptions,
  ) =>
    [
      ...logKeys.lists(),
      {
        filters,
        limit,
        live: liveOptions?.live ?? false,
        lookbackMs: liveOptions?.lookbackMs ?? null,
      },
    ] as const,
  facets: () => [...logKeys.all, "facets"] as const,
}

export function logListQuery(
  filters: LogQueryFilters,
  limit = LIST_PAGE_SIZE,
  liveOptions: LogListLiveOptions = {},
) {
  const live = liveOptions.live ?? false
  const lookbackMs = liveOptions.lookbackMs ?? null

  return infiniteQueryOptions({
    queryKey: logKeys.list(filters, limit, liveOptions),
    queryFn: ({ pageParam }) => {
      const since =
        live && lookbackMs != null
          ? new Date(Date.now() - lookbackMs).toISOString()
          : filters.since
      return fetchLogs({ ...filters, since }, limit, pageParam)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      nextPageOffset(lastPage, allPages, limit),
    staleTime: live ? 0 : undefined,
  })
}

export function logFacetsQuery() {
  return queryOptions({
    queryKey: logKeys.facets(),
    queryFn: () => fetchLogFacets(),
    staleTime: 30_000,
  })
}
