import { cn } from "@/lib/utils"

import { severityLabel } from "../../lib/severity"
import type { LogListItem } from "../../types"

function severityTone(label: string): string {
  const key = label.toUpperCase()
  if (key.includes("FATAL") || key.includes("CRITICAL")) {
    return "bg-red-600/15 text-red-700 dark:text-red-400"
  }
  if (key.includes("ERROR")) {
    return "bg-destructive/10 text-destructive dark:bg-destructive/20"
  }
  if (key.includes("WARN")) {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400"
  }
  if (key.includes("INFO")) {
    return "bg-sky-500/15 text-sky-700 dark:text-sky-400"
  }
  if (key.includes("DEBUG")) {
    return "bg-violet-500/15 text-violet-700 dark:text-violet-400"
  }
  if (key.includes("TRACE")) {
    return "bg-muted text-muted-foreground"
  }
  return "bg-muted text-muted-foreground"
}

type SeverityBadgeProps = {
  log?: Pick<LogListItem, "severityText" | "severityNumber">
  label?: string
  className?: string
}

export function SeverityBadge({ log, label, className }: SeverityBadgeProps) {
  const text = label ?? (log ? severityLabel(log) : "UNSPECIFIED")
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        severityTone(text),
        className,
      )}
    >
      {text}
    </span>
  )
}
