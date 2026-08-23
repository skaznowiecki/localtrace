/**
 * Renders an HTTP path or full URL. Absolute URLs mute the origin so the path
 * stays readable (`https://api.example.com/users/42`).
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
      <span className="font-medium text-foreground/90">{pathWithQuery}</span>
    </span>
  )
}
