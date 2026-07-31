import { useQuery } from "@tanstack/react-query"

import { traceDetailQuery } from "../api/traces.api"

export function useTraceDetail(traceId: string | null) {
  const query = useQuery(traceDetailQuery(traceId))

  return {
    detail: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? query.error.message : null,
    reload: traceId ? () => query.refetch() : undefined,
  }
}
