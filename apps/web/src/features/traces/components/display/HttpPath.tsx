/**
 * Renders an HTTP path or full URL with highlighted dynamic segments and query params.
 *
 * Supports:
 * - Absolute URLs: `https://api.example.com/users/42` (origin muted, path highlighted)
 * - Paths: `/invoices/:id/process`
 *
 * Highlights:
 * - Path params: `:id`, `{id}`, numeric IDs, UUIDs
 * - Query keys (sky) and values (amber)
 * - Separators (`/`, `?`, `&`, `=`) slightly muted but readable
 *
 * @example
 * ```tsx
 * <HttpPath value="/invoices/:invoiceFileId/process" />
 * <HttpPath value="http://localhost:4000/invoices/98b1…/process" />
 * ```
 */
import { cn } from "@/lib/utils"

export type HttpPathProps = {
  /** Path or full URL to render. */
  value: string
  className?: string
}

const PARAM_SEGMENT =
  /^(?:\{[^}]+\}|:[A-Za-z_][\w]*|\d+|[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i

function isParamSegment(segment: string): boolean {
  return PARAM_SEGMENT.test(segment)
}

function splitUrl(raw: string): { origin: string | null; pathWithQuery: string } {
  const absolute = /^(https?:\/\/[^/?#]+)([/?#].*)?$/i.exec(raw.trim())
  if (absolute) {
    return {
      origin: absolute[1]!,
      pathWithQuery: absolute[2] ?? "/",
    }
  }
  return { origin: null, pathWithQuery: raw }
}

function PathAndQuery({ pathWithQuery }: { pathWithQuery: string }) {
  const qIndex = pathWithQuery.indexOf("?")
  const pathname = qIndex === -1 ? pathWithQuery : pathWithQuery.slice(0, qIndex)
  const query = qIndex === -1 ? null : pathWithQuery.slice(qIndex + 1)
  const segments = pathname.split("/").filter(Boolean)

  return (
    <>
      {pathname.startsWith("/") ? (
        <span className="font-medium text-foreground/70">/</span>
      ) : null}
      {segments.map((segment, index) => {
        const isParam = isParamSegment(segment)
        return (
          <span key={`${index}-${segment}`}>
            {index > 0 ? (
              <span className="font-medium text-foreground/70">/</span>
            ) : null}
            <span
              className={
                isParam
                  ? "rounded-sm bg-amber-500/10 px-0.5 font-medium text-amber-700 dark:text-amber-400"
                  : "font-medium text-foreground/90"
              }
            >
              {segment}
            </span>
          </span>
        )
      })}
      {query != null && query.length > 0 ? (
        <>
          <span className="font-medium text-foreground/70">?</span>
          {query.split("&").map((pair, index) => {
            const eq = pair.indexOf("=")
            const key = eq === -1 ? pair : pair.slice(0, eq)
            const value = eq === -1 ? null : pair.slice(eq + 1)
            return (
              <span key={`${index}-${pair}`}>
                {index > 0 ? (
                  <span className="font-medium text-foreground/70">&</span>
                ) : null}
                <span className="font-medium text-sky-800 dark:text-sky-400">
                  {key}
                </span>
                {value != null ? (
                  <>
                    <span className="font-medium text-foreground/70">=</span>
                    <span className="rounded-sm bg-amber-500/10 px-0.5 font-medium text-amber-700 dark:text-amber-400">
                      {value}
                    </span>
                  </>
                ) : null}
              </span>
            )
          })}
        </>
      ) : null}
    </>
  )
}

export function HttpPath({ value, className }: HttpPathProps) {
  const { origin, pathWithQuery } = splitUrl(value)

  return (
    <span
      className={cn("min-w-0 truncate font-mono", className)}
      title={value}
    >
      {origin ? (
        <span className="font-medium text-muted-foreground">{origin}</span>
      ) : null}
      <PathAndQuery pathWithQuery={pathWithQuery} />
    </span>
  )
}
