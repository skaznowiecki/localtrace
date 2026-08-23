import { memo } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn, formatSpanDuration } from "@/lib/utils"

import { getSpanColor } from "../../service-colors"
import { spanDisplayLabel } from "../../lib/span-display"
import { extractHttpSpanMeta, isHttpSpan } from "../../lib/http-spans"
import type { FlatSpanRow } from "../../types"

const SHORT_BAR_PCT = 8

function isShortBar(widthPct: number): boolean {
  return widthPct < SHORT_BAR_PCT
}

type WaterfallSpanBarProps = {
  span: FlatSpanRow
  totalDurationMs: number
  isSelected: boolean
  muted?: boolean
  onSelect: (span: FlatSpanRow) => void
}

export const WaterfallSpanBar = memo(function WaterfallSpanBar({
  span,
  totalDurationMs,
  isSelected,
  muted = false,
  onSelect,
}: WaterfallSpanBarProps) {
  const left =
    totalDurationMs > 0 ? (span.startOffsetMs / totalDurationMs) * 100 : 0
  const widthPct =
    totalDurationMs > 0
      ? Math.max((span.durationMs / totalDurationMs) * 100, 0.35)
      : 0
  const short = isShortBar(widthPct)
  const isGroup = span.group != null
  const barColor =
    span.status === "error"
      ? "var(--destructive)"
      : getSpanColor(span.service, span.name)

  const label = isGroup
    ? `${span.group!.name} ×${span.group!.count}`
    : spanDisplayLabel(span)

  const tooltipTarget = (() => {
    if (isGroup || !isHttpSpan(span)) return null
    const meta = extractHttpSpanMeta(span)
    return meta.url ?? meta.path
  })()

  const statsLabel = isGroup
    ? `Σ ${formatSpanDuration(span.group!.totalDurationMs)} · avg ${formatSpanDuration(span.group!.avgDurationMs)} · max ${formatSpanDuration(span.group!.maxDurationMs)}`
    : null

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "absolute inset-y-0 z-10 cursor-pointer overflow-hidden rounded-sm border border-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isSelected &&
            "z-20 ring-2 ring-foreground/70 ring-offset-1 ring-offset-background",
          muted && "opacity-35",
        )}
        style={{
          left: `${left}%`,
          width: `max(2px, calc(${widthPct}% - 2px))`,
          backgroundColor: barColor,
        }}
        render={
          <button
            type="button"
            aria-pressed={isSelected}
            onClick={(event) => {
              event.stopPropagation()
              onSelect(span)
            }}
          />
        }
      >
        {!short ? (
          <span className="flex h-full min-w-0 items-center justify-between gap-1 px-1.5 text-white">
            <span className="min-w-0 truncate text-left text-[11px] font-medium drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">
              {label}
            </span>
            <span className="shrink-0 font-mono text-[10px] tabular-nums drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">
              {isGroup
                ? formatSpanDuration(span.group!.totalDurationMs)
                : formatSpanDuration(span.durationMs)}
            </span>
          </span>
        ) : null}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-xs flex-col items-stretch gap-1 px-3 py-2"
      >
        <p className="font-medium">{label}</p>
        {tooltipTarget && tooltipTarget !== label ? (
          <p className="break-all text-background/80">{tooltipTarget}</p>
        ) : null}
        <p className="text-background/80">{span.service}</p>
        {isGroup && statsLabel ? (
          <p className="font-mono tabular-nums text-background/80">
            {statsLabel}
          </p>
        ) : (
          <p className="font-mono tabular-nums text-background/80">
            offset {formatSpanDuration(span.startOffsetMs)} · duration{" "}
            {formatSpanDuration(span.durationMs)}
          </p>
        )}
        {span.statusMessage ? (
          <p className="text-background/80">{span.statusMessage}</p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
})
