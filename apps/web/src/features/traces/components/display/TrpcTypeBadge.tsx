import { cn } from "@/lib/utils"

import type { TrpcProcedureType } from "../../lib/trpc-spans"

/**
 * Colored badge for a tRPC procedure type (query / mutation / subscription).
 *
 * Use this everywhere a tRPC kind is shown so colors stay consistent across
 * the waterfall, stats, drawer header, and overview panels.
 *
 * | Type         | Color   |
 * | ------------ | ------- |
 * | query        | emerald |
 * | mutation     | sky     |
 * | subscription | violet  |
 * | unknown      | muted   |
 */
export type TrpcTypeBadgeProps = {
  type: TrpcProcedureType | string
  className?: string
}

const TYPE_BADGE_CLASS: Record<string, string> = {
  query: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  mutation: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  subscription: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
}

export function TrpcTypeBadge({ type, className }: TrpcTypeBadgeProps) {
  const normalized = type.trim().toLowerCase()

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide lowercase",
        TYPE_BADGE_CLASS[normalized] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {normalized || type}
    </span>
  )
}
