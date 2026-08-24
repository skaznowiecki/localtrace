import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react"

import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type SortableHeadProps<TField extends string> = {
  column: TField
  label: string
  sort: TField
  order: "asc" | "desc"
  onSort: (column: TField) => void
  align?: "left" | "center"
}

export function SortableHead<TField extends string>({
  column,
  label,
  sort,
  order,
  onSort,
  align = "left",
}: SortableHeadProps<TField>) {
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
