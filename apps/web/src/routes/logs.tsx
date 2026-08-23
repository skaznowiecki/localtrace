import { createFileRoute } from "@tanstack/react-router"

import {
  isLogSortField,
  isLogSortOrder,
  LogsTable,
  type LogSortField,
  type LogSortOrder,
} from "@/features/logs"

type LogsSearch = {
  log?: string
  q?: string
  sort?: LogSortField
  order?: LogSortOrder
}

export const Route = createFileRoute("/logs")({
  validateSearch: (search: Record<string, unknown>): LogsSearch => {
    const result: LogsSearch = {}
    if (typeof search.log === "string" && search.log.length > 0) {
      result.log = search.log
    }
    if (typeof search.q === "string" && search.q.length > 0) {
      result.q = search.q
    }
    if (isLogSortField(search.sort)) {
      result.sort = search.sort
    }
    if (isLogSortOrder(search.order)) {
      result.order = search.order
    }
    return result
  },
  component: LogsPage,
})

function LogsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <LogsTable />
    </div>
  )
}
