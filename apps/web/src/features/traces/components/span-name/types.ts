import type { ReactNode } from "react"

import type { JsonValue } from "../../types"

/** Input for span name rendering across waterfall, stats, and details. */
export type SpanNameInput = {
  name: string
  attributes?: JsonValue | null
  /** Dense label for bars (no badges). */
  compact?: boolean
}

export type SpanNameStrategy = {
  id: string
  match: (input: SpanNameInput) => boolean
  render: (input: SpanNameInput) => ReactNode
}
