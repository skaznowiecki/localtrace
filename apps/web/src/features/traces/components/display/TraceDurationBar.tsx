import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn, formatSpanDuration } from "@/lib/utils"

import { getServiceColor } from "../../service-colors"
import type { TraceBreakdownItem } from "../../types"

type TraceDurationBarProps = {
  breakdown: TraceBreakdownItem[] | null
  className?: string
}

export function TraceDurationBar({
  breakdown,
  className,
}: TraceDurationBarProps) {
  if (breakdown == null) {
    return (
      <div
        className={cn(
          "flex h-3 w-full min-w-[120px] max-w-[220px] items-center text-[11px] text-muted-foreground animate-pulse",
          className,
        )}
      >
        Processing
      </div>
    )
  }

  const bar = (
    <div
      className={cn(
        "flex h-3 w-full min-w-[120px] max-w-[220px] overflow-hidden rounded-sm bg-muted",
        className,
      )}
    >
      {breakdown.map((item) => (
        <div
          key={item.name}
          className="h-full min-w-px"
          style={{
            width: `${Math.max(item.share * 100, 0)}%`,
            backgroundColor: getServiceColor(item.name),
          }}
        />
      ))}
    </div>
  )

  if (breakdown.length === 0) return bar

  return (
    <Tooltip>
      <TooltipTrigger
        className="w-full min-w-[120px] max-w-[220px] cursor-pointer"
        render={<div />}
      >
        {bar}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-xs flex-col items-stretch gap-1 px-3 py-2"
      >
        {breakdown.map((item) => (
          <p
            key={item.name}
            className="flex items-center justify-between gap-4 font-mono text-[11px] tabular-nums"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-sm"
                style={{ backgroundColor: getServiceColor(item.name) }}
              />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="shrink-0 text-background/80">
              {formatSpanDuration(item.durationMs)} · {Math.round(item.share * 100)}%
            </span>
          </p>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}
