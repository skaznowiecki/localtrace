import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { logListQuery, type LogListLiveOptions } from "../api/logs.api"
import type { LogQueryFilters } from "../lib/log-filter"

const DEFAULT_LIMIT = 100

export function useLogs(
  filters: LogQueryFilters = {},
  liveOptions: LogListLiveOptions = {},
  limit = DEFAULT_LIMIT,
) {
  const query = useQuery({
    ...logListQuery(filters, limit, liveOptions),
    placeholderData: keepPreviousData,
  })

  return {
    logs: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? query.error.message : null,
  }
}
