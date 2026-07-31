import { useQuery } from "@tanstack/react-query"

import {
  traceListQuery,
  type TraceListLiveOptions,
} from "../api/traces.api"
import type { TraceQueryFilters } from "../lib/trace-filter"

const DEFAULT_LIMIT = 100

export function useTraces(
  filters: TraceQueryFilters = {},
  liveOptions: TraceListLiveOptions = {},
  limit = DEFAULT_LIMIT,
) {
  const query = useQuery(traceListQuery(filters, limit, liveOptions))

  return {
    traces: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? query.error.message : null,
  }
}
