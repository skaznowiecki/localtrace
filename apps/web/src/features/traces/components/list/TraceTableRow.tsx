import { TableCell, TableRow } from "@/components/ui/table"
import { formatSpanDuration, formatTraceDate } from "@/lib/utils"

import type { TraceListItem } from "../../types"
import { HttpStatusCodeBadge } from "../display/HttpStatusCodeBadge"
import { ServiceBadge } from "../display/ServiceBadge"
import { TraceDurationBar } from "../display/TraceDurationBar"
import { TraceStatusBadge } from "../display/TraceStatusBadge"
import { TraceName } from "../trace-name"

type TraceTableRowProps = {
  trace: TraceListItem
  isSelected: boolean
  onSelect: (traceId: string) => void
}

export function TraceTableRow({
  trace,
  isSelected,
  onSelect,
}: TraceTableRowProps) {
  return (
    <TableRow
      data-state={isSelected ? "selected" : undefined}
      className="cursor-pointer hover:bg-muted/30 data-[state=selected]:bg-muted/50"
      onClick={() => onSelect(trace.id)}
    >
      <TableCell className="px-3 py-2 font-mono text-[11px] text-muted-foreground tabular-nums">
        {formatTraceDate(trace.startTime)}
      </TableCell>
      <TableCell className="px-3 py-2">
        <ServiceBadge service={trace.rootService} />
      </TableCell>
      <TableCell className="max-w-[280px] truncate px-3 py-2 text-[11px]">
        <TraceName name={trace.name} path={trace.httpRoute} />
      </TableCell>
      <TableCell className="px-3 py-2 text-center font-mono text-[11px] tabular-nums">
        {formatSpanDuration(trace.durationMs)}
      </TableCell>
      <TableCell className="px-3 py-2 text-center font-mono text-[11px] tabular-nums">
        {trace.spanCount}
      </TableCell>
      <TableCell className="px-3 py-2 text-center">
        {trace.httpStatusCode ? (
          <HttpStatusCodeBadge code={trace.httpStatusCode} />
        ) : (
          <TraceStatusBadge status={trace.status} />
        )}
      </TableCell>
      <TableCell className="px-3 py-2">
        <TraceDurationBar breakdown={trace.breakdown} />
      </TableCell>
    </TableRow>
  )
}
