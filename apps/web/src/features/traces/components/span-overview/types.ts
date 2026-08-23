import type { ReactNode } from "react"

import type { Span } from "../../types"

/**
 * Span Overview strategies — first match wins.
 *
 * Match `span.type` from the API (`helpers/span-type` detectors). Do not
 * re-parse semantic attributes here. Register in `strategies/index.ts`.
 * When a strategy matches, TraceSpanDetails collapses Span Attributes.
 */
export type SpanOverviewStrategy = {
  id: string
  match: (span: Span) => boolean
  render: (span: Span) => ReactNode
}
