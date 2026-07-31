import { HttpMethodBadge } from "../../display/HttpMethodBadge"
import {
  httpHostForSpan,
  parseHttpSpanLabel,
} from "../../../lib/span-display"
import type { Span } from "../../../types"
import type { SpanNameInput, SpanNameStrategy } from "../types"

function resolveHttpParts(input: SpanNameInput): {
  method: string
  host: string | null
} | null {
  const parsed = parseHttpSpanLabel(input.name)
  if (!parsed) return null

  const hostFromAttrs =
    input.attributes != null
      ? httpHostForSpan({
          name: input.name,
          attributes: input.attributes,
        } as Pick<Span, "name" | "attributes">)
      : null

  // Prefer live attrs; otherwise use target from an already-enriched label
  // (e.g. stats row "GET s3.amazonaws.com") when it looks like a host.
  const host =
    hostFromAttrs ??
    (parsed.target && !parsed.target.startsWith("/") ? parsed.target : null)

  return { method: parsed.method, host }
}

export const httpStrategy: SpanNameStrategy = {
  id: "http",
  match: (input) => parseHttpSpanLabel(input.name) != null,
  render: (input) => {
    const parts = resolveHttpParts(input)
    if (!parts) return input.name

    const title = parts.host
      ? `${parts.method} ${parts.host}`
      : parts.method

    if (input.compact) {
      return (
        <span className="block truncate" title={title}>
          {title}
        </span>
      )
    }

    return (
      <span
        className="inline-flex min-w-0 max-w-full items-center gap-1.5"
        title={title}
      >
        <HttpMethodBadge method={parts.method} />
        {parts.host ? (
          <span className="min-w-0 truncate font-mono text-[12px] text-foreground">
            {parts.host}
          </span>
        ) : null}
      </span>
    )
  },
}
