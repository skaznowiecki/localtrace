import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query"

import { LIST_PAGE_SIZE, flattenUniqueById, prependUniqueById } from "@/lib/infinite-pages"
import {
  fetchLogs,
  logListQuery,
  logKeys,
  type LogListLiveOptions,
} from "../api/logs.api"
import type { LogQueryFilters } from "../lib/log-filter"
import type { LogListItem } from "../types"

export function useLogs(
  filters: LogQueryFilters = {},
  liveOptions: LogListLiveOptions = {},
) {
  const queryClient = useQueryClient()
  const pageSize = LIST_PAGE_SIZE
  const queryKey = logKeys.list(filters, pageSize, liveOptions)
  const live = liveOptions.live ?? false
  const lookbackMs = liveOptions.lookbackMs ?? null

  const query = useInfiniteQuery({
    ...logListQuery(filters, pageSize, liveOptions),
    placeholderData: keepPreviousData,
  })

  useQuery({
    queryKey: [...queryKey, "live-head"],
    enabled: live && query.isFetched,
    refetchInterval: 2_000,
    staleTime: 0,
    queryFn: async () => {
      const since =
        lookbackMs != null
          ? new Date(Date.now() - lookbackMs).toISOString()
          : filters.since
      const head = await fetchLogs({ ...filters, since }, pageSize, 0)
      queryClient.setQueryData(
        queryKey,
        (old: InfiniteData<LogListItem[], number> | undefined) => {
          if (!old) return old
          const pages = prependUniqueById(old.pages, head)
          if (pages === old.pages) return old
          return { ...old, pages }
        },
      )
      return head
    },
  })

  return {
    logs: flattenUniqueById(query.data?.pages),
    isLoading: query.isLoading,
    error: query.error ? query.error.message : null,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  }
}
