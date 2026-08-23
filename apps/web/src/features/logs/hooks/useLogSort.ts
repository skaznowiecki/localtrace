import { useCallback } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"

import {
  DEFAULT_LOG_ORDER,
  DEFAULT_LOG_SORT,
  isLogSortField,
  isLogSortOrder,
  LOG_SORT_DEFAULT_ORDER,
  type LogSortField,
  type LogSortOrder,
} from "../lib/log-filter"

export function useLogSort() {
  const navigate = useNavigate({ from: "/logs" })
  const search = useSearch({ from: "/logs" })

  const sort = isLogSortField(search.sort) ? search.sort : DEFAULT_LOG_SORT
  const order = isLogSortOrder(search.order)
    ? search.order
    : DEFAULT_LOG_ORDER

  const setSort = useCallback(
    (column: LogSortField) => {
      void navigate({
        search: (prev) => {
          const currentSort = isLogSortField(prev.sort)
            ? prev.sort
            : DEFAULT_LOG_SORT
          const currentOrder = isLogSortOrder(prev.order)
            ? prev.order
            : DEFAULT_LOG_ORDER
          const nextSort = column
          const nextOrder =
            currentSort === column
              ? currentOrder === "asc"
                ? "desc"
                : "asc"
              : LOG_SORT_DEFAULT_ORDER[column]
          const isDefault =
            nextSort === DEFAULT_LOG_SORT && nextOrder === DEFAULT_LOG_ORDER
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
    sort: LogSortField
    order: LogSortOrder
    setSort: (column: LogSortField) => void
  }
}
