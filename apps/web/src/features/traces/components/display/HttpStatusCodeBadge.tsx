import { cn } from "@/lib/utils"

/**
 * Colored badge for an HTTP response status code (200, 404, 500, …).
 *
 * Use this everywhere a status code is shown so colors stay consistent across
 * the traces list, drawer header, span details, and overview panels.
 *
 * | Range   | Color       |
 * | ------- | ----------- |
 * | 1xx     | slate       |
 * | 2xx     | emerald     |
 * | 3xx     | sky         |
 * | 4xx     | amber       |
 * | 5xx     | destructive |
 * | other   | muted       |
 *
 * @example
 * ```tsx
 * <HttpStatusCodeBadge code="200" />
 * <HttpStatusCodeBadge code={meta.statusCode} className="text-[12px]" />
 * ```
 */
export type HttpStatusCodeBadgeProps = {
  /** HTTP status code as string or number (e.g. `"200"` / `200`). */
  code: string | number
  className?: string
}

function statusBadgeClass(code: string): string {
  const n = Number(code)
  if (!Number.isFinite(n)) return "bg-muted text-muted-foreground"
  if (n >= 100 && n < 200) {
    return "bg-slate-500/10 text-slate-700 dark:text-slate-300"
  }
  if (n >= 200 && n < 300) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
  }
  if (n >= 300 && n < 400) {
    return "bg-sky-500/10 text-sky-700 dark:text-sky-400"
  }
  if (n >= 400 && n < 500) {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400"
  }
  if (n >= 500 && n < 600) {
    return "bg-destructive/10 text-destructive"
  }
  return "bg-muted text-muted-foreground"
}

export function HttpStatusCodeBadge({
  code,
  className,
}: HttpStatusCodeBadgeProps) {
  const normalized = String(code).trim()

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        statusBadgeClass(normalized),
        className,
      )}
    >
      {normalized}
    </span>
  )
}
