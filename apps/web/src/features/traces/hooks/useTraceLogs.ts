import { useQuery } from "@tanstack/react-query"

import { traceLogsQuery } from "../api/traces.api"

export function useTraceLogs(traceId: string | null) {
  const query = useQuery(traceLogsQuery(traceId))

  return {
    logs: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? query.error.message : null,
    reload: traceId ? () => query.refetch() : undefined,
  }
}
