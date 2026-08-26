import { createFileRoute } from "@tanstack/react-router"

import { parseTimeRangeSearch, type TimeRangeSearch } from "@/features/time-range"
import {
  isTraceSortField,
  isTraceSortOrder,
  TracesTable,
  type TraceSortField,
  type TraceSortOrder,
} from "@/features/traces"

type TracesSearch = TimeRangeSearch & {
  trace?: string
  q?: string
  sort?: TraceSortField
  order?: TraceSortOrder
}

export const Route = createFileRoute("/traces")({
  validateSearch: (search: Record<string, unknown>): TracesSearch => {
    const result: TracesSearch = { ...parseTimeRangeSearch(search) }
    if (typeof search.trace === "string" && search.trace.length > 0) {
      result.trace = search.trace
    }
    if (typeof search.q === "string" && search.q.length > 0) {
      result.q = search.q
    }
    if (isTraceSortField(search.sort)) {
      result.sort = search.sort
    }
    if (isTraceSortOrder(search.order)) {
      result.order = search.order
    }
    return result
  },
  component: TracesPage,
})

function TracesPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <TracesTable />
    </div>
  )
}
