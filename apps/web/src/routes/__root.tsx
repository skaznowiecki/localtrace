import {
  createRootRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { TooltipProvider } from "@/components/ui/tooltip"
import { LiveHeader, TimeRangeProvider } from "@/features/time-range"

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <TooltipProvider>
      <TimeRangeProvider>
        <div className="flex h-svh flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4">
            <RouteSwitcher />
            <TracesHeaderActions />
          </header>
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </main>
        </div>
      </TimeRangeProvider>
    </TooltipProvider>
  )
}

function TracesHeaderActions() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  if (
    !pathname.startsWith("/traces") &&
    !pathname.startsWith("/logs") &&
    pathname !== "/"
  ) {
    return null
  }
  return <LiveHeader />
}

function RouteSwitcher() {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const activeRoute = pathname.startsWith("/logs") ? "logs" : "traces"

  return (
    <ToggleGroup
      value={[activeRoute]}
      onValueChange={(value) => {
        const next = value[0]
        if (next === "traces") {
          navigate({ to: "/traces" })
        }
        if (next === "logs") {
          navigate({ to: "/logs" })
        }
      }}
      spacing={0}
      variant="outline"
    >
      <ToggleGroupItem value="traces">Trazas</ToggleGroupItem>
      <ToggleGroupItem value="logs">Logs</ToggleGroupItem>
    </ToggleGroup>
  )
}
