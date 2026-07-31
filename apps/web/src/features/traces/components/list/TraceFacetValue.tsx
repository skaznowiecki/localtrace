import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type TraceFacetValueProps = {
  label: ReactNode
  count?: number
  selected: boolean
  onSelect: () => void
  title?: string
}

export function TraceFacetValue({
  label,
  count,
  selected,
  onSelect,
  title,
}: TraceFacetValueProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors",
        selected
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-muted/80",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null ? (
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {count}
        </span>
      ) : null}
    </button>
  )
}
