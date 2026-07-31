import { cn } from "@/lib/utils"

import type { TraceStatus } from "../../types"

type TraceStatusBadgeProps = {
  status: TraceStatus
  className?: string
}

const LABELS: Record<TraceStatus, string> = {
  ok: "OK",
  error: "Error",
  unset: "Unset",
}

export function TraceStatusBadge({ status, className }: TraceStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        status === "error" &&
          "bg-destructive/10 text-destructive dark:bg-destructive/20",
        status === "ok" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        status === "unset" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      {LABELS[status]}
    </span>
  )
}
