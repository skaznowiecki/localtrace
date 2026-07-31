import { memo, useMemo } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, formatSpanDuration } from "@/lib/utils"

import {
  aggregateSpanNameStats,
  type SpanNameStat,
} from "../../lib/span-name-stats"
import type { Span } from "../../types"
import { SpanName } from "../span-name"

type TraceSpanNameStatsProps = {
  spans: Span[]
  selectedSpanId?: string | null
  onSelectSpan?: (spanId: string) => void
}

function PctBar({ stat }: { stat: SpanNameStat }) {
  const width = Math.min(Math.max(stat.pct, 0), 100)

  return (
    <div className="flex min-w-22 items-center gap-2">
      <span className="w-8 shrink-0 text-right font-mono text-[12px] tabular-nums text-foreground">
        {Math.round(stat.pct)}%
      </span>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${width}%`, backgroundColor: stat.color }}
        />
      </div>
    </div>
  )
}

type StatRowProps = {
  stat: SpanNameStat
  isSelected: boolean
  onSelectSpan?: (spanId: string) => void
}

const StatRow = memo(function StatRow({
  stat,
  isSelected,
  onSelectSpan,
}: StatRowProps) {
  const clickable = onSelectSpan != null

  return (
    <TableRow
      className={cn(
        "hover:bg-muted/30",
        clickable && "cursor-pointer",
        isSelected && "bg-muted/50 hover:bg-muted/50",
      )}
      aria-selected={isSelected}
      onClick={
        clickable ? () => onSelectSpan(stat.representativeSpanId) : undefined
      }
    >
      <TableCell className="max-w-md px-2 py-1.5">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: stat.color }}
            aria-hidden
          />
          <span className="min-w-0 truncate text-[13px] text-foreground">
            <SpanName name={stat.name} />
          </span>
        </span>
      </TableCell>
      <TableCell className="px-2 py-1.5 text-right font-mono text-[12px] tabular-nums text-muted-foreground">
        {stat.count}
      </TableCell>
      <TableCell className="px-2 py-1.5 text-right font-mono text-[12px] tabular-nums text-foreground">
        {formatSpanDuration(stat.totalMs)}
      </TableCell>
      <TableCell className="px-2 py-1.5 text-right font-mono text-[12px] tabular-nums text-muted-foreground">
        {formatSpanDuration(stat.avgMs)}
      </TableCell>
      <TableCell className="px-2 py-1.5">
        <PctBar stat={stat} />
      </TableCell>
    </TableRow>
  )
}, (prev, next) =>
  prev.stat === next.stat &&
  prev.isSelected === next.isSelected &&
  prev.onSelectSpan === next.onSelectSpan,
)

export function TraceSpanNameStats({
  spans,
  selectedSpanId,
  onSelectSpan,
}: TraceSpanNameStatsProps) {
  const stats = useMemo(() => aggregateSpanNameStats(spans), [spans])

  if (spans.length === 0 || stats.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No spans in this trace
      </p>
    )
  }

  return (
    <div className="flex flex-col pt-1">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 px-2 text-[11px]">Name</TableHead>
            <TableHead className="h-8 px-2 text-right text-[11px]">
              Count
            </TableHead>
            <TableHead className="h-8 px-2 text-right text-[11px]">
              Total
            </TableHead>
            <TableHead className="h-8 px-2 text-right text-[11px]">
              Avg
            </TableHead>
            <TableHead className="h-8 px-2 text-[11px]">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.map((stat) => {
            const isSelected =
              selectedSpanId != null && stat.spanIds.includes(selectedSpanId)

            return (
              <StatRow
                key={stat.name}
                stat={stat}
                isSelected={isSelected}
                onSelectSpan={onSelectSpan}
              />
            )
          })}
        </TableBody>
      </Table>

      <p className="pt-2 text-[11px] text-muted-foreground">
        Percentages are share of exclusive time (span duration minus children).
      </p>
    </div>
  )
}
