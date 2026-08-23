import { useCallback, useMemo } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"

import {
  parseQuery,
  setFilterInQuery,
  type LogFilterKey,
  type LogQueryFilters,
} from "../lib/log-filter"

export function useLogFilters() {
  const navigate = useNavigate({ from: "/logs" })
  const { q } = useSearch({ from: "/logs" })
  const query = q ?? ""

  const filters = useMemo(() => parseQuery(query), [query])

  const setQuery = useCallback(
    (next: string, options?: { replace?: boolean }) => {
      const trimmed = next.trim()
      void navigate({
        search: (prev) => ({
          ...prev,
          q: trimmed.length > 0 ? trimmed : undefined,
        }),
        replace: options?.replace ?? true,
      })
    },
    [navigate],
  )

  const setFilter = useCallback(
    (key: LogFilterKey, value: string | null) => {
      setQuery(setFilterInQuery(query, key, value))
    },
    [query, setQuery],
  )

  return {
    query,
    filters,
    setQuery,
    setFilter,
  } satisfies {
    query: string
    filters: LogQueryFilters
    setQuery: (next: string, options?: { replace?: boolean }) => void
    setFilter: (key: LogFilterKey, value: string | null) => void
  }
}
