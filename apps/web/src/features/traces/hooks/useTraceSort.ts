import { useCallback } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"

import {
  DEFAULT_TRACE_ORDER,
  DEFAULT_TRACE_SORT,
  isTraceSortField,
  isTraceSortOrder,
  TRACE_SORT_DEFAULT_ORDER,
  type TraceSortField,
  type TraceSortOrder,
} from "../lib/trace-filter"

export function useTraceSort() {
  const navigate = useNavigate({ from: "/traces" })
  const search = useSearch({ from: "/traces" })

  const sort = isTraceSortField(search.sort) ? search.sort : DEFAULT_TRACE_SORT
  const order = isTraceSortOrder(search.order)
    ? search.order
    : DEFAULT_TRACE_ORDER

  const setSort = useCallback(
    (column: TraceSortField) => {
      void navigate({
        search: (prev) => {
          const currentSort = isTraceSortField(prev.sort)
            ? prev.sort
            : DEFAULT_TRACE_SORT
          const currentOrder = isTraceSortOrder(prev.order)
            ? prev.order
            : DEFAULT_TRACE_ORDER
          const nextSort = column
          const nextOrder =
            currentSort === column
              ? currentOrder === "asc"
                ? "desc"
                : "asc"
              : TRACE_SORT_DEFAULT_ORDER[column]
          const isDefault =
            nextSort === DEFAULT_TRACE_SORT && nextOrder === DEFAULT_TRACE_ORDER
          return {
            ...prev,
            sort: isDefault ? undefined : nextSort,
            order: isDefault ? undefined : nextOrder,
          }
        },
        replace: true,
      })
    },
    [navigate],
  )

  return {
    sort,
    order,
    setSort,
  } satisfies {
    sort: TraceSortField
    order: TraceSortOrder
    setSort: (column: TraceSortField) => void
  }
}
