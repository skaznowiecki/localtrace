import { useQuery } from "@tanstack/react-query"

import { traceFacetsQuery, type TraceFacets } from "../api/traces.api"

const EMPTY_FACETS: TraceFacets = {
  services: [],
  statuses: ["ok", "error"],
  methods: [],
  httpStatusCodes: [],
  routes: [],
}

export function useTraceFacets() {
  const query = useQuery(traceFacetsQuery())

  return {
    facets: query.data ?? EMPTY_FACETS,
    isLoading: query.isLoading,
    error: query.error ? query.error.message : null,
    reload: () => query.refetch(),
  }
}
