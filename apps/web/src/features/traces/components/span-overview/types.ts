import type { ReactNode } from "react"

import type { Span } from "../../types"

/**
 * Span Overview strategies — first match wins.
 *
 * Detect span type via semantic attributes (`http.*`, `db.*`, …), not `span.kind`.
 * Register new strategies in `strategies/index.ts`. When a strategy matches,
 * TraceSpanDetails collapses Span Attributes by default.
 */
export type SpanOverviewStrategy = {
  id: string
  match: (span: Span) => boolean
  render: (span: Span) => ReactNode
}
