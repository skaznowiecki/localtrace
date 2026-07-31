import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export type TraceViewMode = "waterfall" | "stats"

type WaterfallToolbarProps = {
  view: TraceViewMode
  onViewChange: (view: TraceViewMode) => void
  criticalPathEnabled: boolean
  onCriticalPathChange: (enabled: boolean) => void
  criticalPathCount: number
}

export function WaterfallToolbar({
  view,
  onViewChange,
  criticalPathEnabled,
  onCriticalPathChange,
  criticalPathCount,
}: WaterfallToolbarProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b bg-muted/10 px-3 py-1.5">
      <ToggleGroup
        value={[view]}
        onValueChange={(value) => {
          const next = value[0]
          if (next === "waterfall" || next === "stats") {
            onViewChange(next)
          }
        }}
        spacing={0}
        variant="outline"
        size="sm"
        className="h-7"
      >
        <ToggleGroupItem
          value="waterfall"
          className="h-7 cursor-pointer rounded-md px-2.5 text-xs"
        >
          Waterfall
        </ToggleGroupItem>
        <ToggleGroupItem
          value="stats"
          className="h-7 cursor-pointer rounded-md px-2.5 text-xs"
        >
          Stats
        </ToggleGroupItem>
      </ToggleGroup>

      {view === "waterfall" ? (
        <>
          <Toggle
            size="sm"
            variant="outline"
            pressed={criticalPathEnabled}
            onPressedChange={onCriticalPathChange}
            className={cn(
              "h-7 rounded-md px-2.5 text-xs",
              criticalPathEnabled &&
                "border-foreground/20 bg-foreground/5 aria-pressed:bg-foreground/10",
            )}
            aria-label="Highlight critical path"
          >
            Critical path
          </Toggle>
          {criticalPathEnabled && criticalPathCount > 0 ? (
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {criticalPathCount} spans
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
