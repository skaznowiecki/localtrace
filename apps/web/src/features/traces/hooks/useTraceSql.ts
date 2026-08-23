import { useQuery } from "@tanstack/react-query"

import { traceSqlQuery } from "../api/traces.api"

export function useTraceSql(traceId: string | null) {
  const query = useQuery(traceSqlQuery(traceId))

  return {
    queries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? query.error.message : null,
    reload: traceId ? () => query.refetch() : undefined,
  }
}
