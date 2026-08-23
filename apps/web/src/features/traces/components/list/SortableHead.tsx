import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react"

import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import type { TraceSortField, TraceSortOrder } from "../../lib/trace-filter"

type SortableHeadProps = {
  column: TraceSortField
  label: string
  sort: TraceSortField
  order: TraceSortOrder
  onSort: (column: TraceSortField) => void
  align?: "left" | "center"
}

export function SortableHead({
  column,
  label,
  sort,
  order,
  onSort,
  align = "left",
}: SortableHeadProps) {
  const active = sort === column
  const ariaSort = active
    ? order === "asc"
      ? "ascending"
      : "descending"
    : "none"

  return (
    <TableHead
      aria-sort={ariaSort}
      className={cn(
        "h-9 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase",
        align === "center" && "text-center",
      )}
    >
      <button
        type="button"
        className={cn(
          "group inline-flex cursor-pointer items-center gap-1",
          align === "center" && "w-full justify-center",
        )}
        onClick={() => onSort(column)}
      >
        {label}
        <span
          className={cn(
            "inline-flex size-3 shrink-0 items-center justify-center",
            active
              ? "text-foreground"
              : "opacity-0 group-hover:opacity-50",
          )}
          aria-hidden={!active}
        >
          {active ? (
            order === "desc" ? (
              <ArrowDownIcon className="size-3" />
            ) : (
              <ArrowUpIcon className="size-3" />
            )
          ) : (
            <ChevronsUpDownIcon className="size-3" />
          )}
        </span>
      </button>
    </TableHead>
  )
}
