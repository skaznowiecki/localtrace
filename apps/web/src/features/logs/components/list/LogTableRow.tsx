import { Link } from "@tanstack/react-router"

import { TableCell, TableRow } from "@/components/ui/table"
import { ServiceBadge } from "@/features/traces"
import { formatTraceDate } from "@/lib/utils"

import { bodyToText } from "../../lib/severity"
import type { LogListItem } from "../../types"
import { SeverityBadge } from "../display/SeverityBadge"

type LogTableRowProps = {
  log: LogListItem
  isSelected: boolean
  onSelect: (logId: string) => void
}

export function LogTableRow({ log, isSelected, onSelect }: LogTableRowProps) {
  const bodyText = bodyToText(log.body)

  return (
    <TableRow
      data-state={isSelected ? "selected" : undefined}
      className="cursor-pointer hover:bg-muted/30 data-[state=selected]:bg-muted/50"
      onClick={() => onSelect(log.id)}
    >
      <TableCell className="px-3 py-2 font-mono text-[11px] text-muted-foreground tabular-nums">
        {formatTraceDate(log.time)}
      </TableCell>
      <TableCell className="px-3 py-2">
        <ServiceBadge service={log.service} />
      </TableCell>
      <TableCell className="px-3 py-2">
        <SeverityBadge log={log} />
      </TableCell>
      <TableCell className="max-w-[420px] truncate px-3 py-2 text-[11px]">
        {bodyText || (
          <span className="text-muted-foreground italic">Empty body</span>
        )}
      </TableCell>
      <TableCell className="px-3 py-2 font-mono text-[11px]">
        {log.traceId ? (
          <Link
            to="/traces"
            search={{ trace: log.traceId }}
            onClick={(event) => event.stopPropagation()}
            className="cursor-pointer text-sky-700 hover:underline dark:text-sky-300"
          >
            {log.traceId.slice(0, 8)}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}
