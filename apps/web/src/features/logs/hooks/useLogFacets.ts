import { useQuery } from "@tanstack/react-query"

import { logFacetsQuery, type LogFacets } from "../api/logs.api"

const EMPTY_FACETS: LogFacets = {
  services: [],
  severities: [],
}

export function useLogFacets() {
  const query = useQuery(logFacetsQuery())

  return {
    facets: query.data ?? EMPTY_FACETS,
    isLoading: query.isLoading,
    error: query.error ? query.error.message : null,
    reload: () => query.refetch(),
  }
}
