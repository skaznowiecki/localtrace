import { createFileRoute } from "@tanstack/react-router"

import { TracesTable } from "@/features/traces"

type TracesSearch = {
  trace?: string
  q?: string
}

export const Route = createFileRoute("/traces")({
  validateSearch: (search: Record<string, unknown>): TracesSearch => {
    const result: TracesSearch = {}
    if (typeof search.trace === "string" && search.trace.length > 0) {
      result.trace = search.trace
    }
    if (typeof search.q === "string" && search.q.length > 0) {
      result.q = search.q
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
