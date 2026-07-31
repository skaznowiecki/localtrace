import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/logs")({
  component: LogsPage,
})

function LogsPage() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      <h1 className="shrink-0 text-2xl font-semibold">Logs</h1>
      <div className="min-h-0 flex-1 rounded-xl bg-muted/50" />
    </div>
  )
}
