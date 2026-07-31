import { cn } from "@/lib/utils"

/**
 * Colored badge for an HTTP request method (GET, POST, …).
 *
 * Use this everywhere a method verb is shown so colors stay consistent across
 * the traces list, drawer header, span details, and overview panels.
 *
 * | Method  | Color      |
 * | ------- | ---------- |
 * | GET     | emerald    |
 * | POST    | sky        |
 * | PUT     | amber      |
 * | PATCH   | violet     |
 * | DELETE  | destructive|
 * | HEAD / OPTIONS / CONNECT / TRACE | slate |
 * | unknown | muted      |
 *
 * @example
 * ```tsx
 * <HttpMethodBadge method="GET" />
 * <HttpMethodBadge method={meta.method} className="text-[11px]" />
 * ```
 */
export type HttpMethodBadgeProps = {
  /** HTTP verb; normalized to uppercase for display and color lookup. */
  method: string
  className?: string
}

const METHOD_BADGE_CLASS: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  POST: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  PUT: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  PATCH: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  DELETE: "bg-destructive/10 text-destructive",
  HEAD: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  OPTIONS: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  CONNECT: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  TRACE: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
}

export function HttpMethodBadge({ method, className }: HttpMethodBadgeProps) {
  const normalized = method.trim().toUpperCase()

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        METHOD_BADGE_CLASS[normalized] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {normalized}
    </span>
  )
}
