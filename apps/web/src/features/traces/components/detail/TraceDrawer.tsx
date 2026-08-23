import { AlertCircleIcon } from "lucide-react"
import { useState } from "react"

import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { useTraceDetail } from "../../hooks/useTraceDetail"
import { useTraceLogs } from "../../hooks/useTraceLogs"
import { useTraceSql } from "../../hooks/useTraceSql"
import { TraceDrawerHeader } from "./TraceDrawerHeader"
import { TraceWaterfall } from "./TraceWaterfall"

type TraceDrawerProps = {
  traceId: string | null
  onOpenChange: (open: boolean) => void
}

export function TraceDrawer({ traceId, onOpenChange }: TraceDrawerProps) {
  const { detail, isLoading, error } = useTraceDetail(traceId)
  const { logs, isLoading: logsLoading } = useTraceLogs(traceId)
  const { queries: sqlQueries, isLoading: sqlLoading } = useTraceSql(traceId)
  const [fullscreen, setFullscreen] = useState(false)

  return (
    <Sheet
      open={traceId !== null}
      onOpenChange={(open) => {
        if (!open) setFullscreen(false)
        onOpenChange(open)
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "flex h-full w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:max-w-none",
          fullscreen
            ? "data-[side=right]:md:w-full data-[side=right]:md:max-w-none"
            : "data-[side=right]:md:w-[70vw] data-[side=right]:md:max-w-[70vw]",
        )}
      >
        {isLoading ? (
          <DrawerSkeleton />
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <AlertCircleIcon className="size-5 text-destructive" />
            <div>
              <p className="text-sm font-medium">Could not load trace</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : detail ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <TraceDrawerHeader
              trace={detail.trace}
              fullscreen={fullscreen}
              onFullscreenChange={setFullscreen}
            />

            <TraceWaterfall
              key={detail.trace.id}
              spans={detail.spans}
              logs={logs}
              logsLoading={logsLoading}
              sqlQueries={sqlQueries}
              sqlLoading={sqlLoading}
            />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function DrawerSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-t-2 border-t-muted px-4 py-2.5">
        <Skeleton className="h-5 w-72 rounded-md" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={`drawer-skeleton-${index}`} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </div>
  )
}
