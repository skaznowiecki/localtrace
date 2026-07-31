import { useCallback, useMemo } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"

import {
  parseQuery,
  setFilterInQuery,
  type TraceFilterKey,
  type TraceQueryFilters,
} from "../lib/trace-filter"

export function useTraceFilters() {
  const navigate = useNavigate({ from: "/traces" })
  const { q } = useSearch({ from: "/traces" })
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
    (key: TraceFilterKey, value: string | null) => {
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
    filters: TraceQueryFilters
    setQuery: (next: string, options?: { replace?: boolean }) => void
    setFilter: (key: TraceFilterKey, value: string | null) => void
  }
}
