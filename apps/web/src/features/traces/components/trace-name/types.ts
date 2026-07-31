import type { ReactNode } from "react"

/** Input for list/header name rendering. `path` fills method-only names (e.g. OPTIONS). */
export type TraceNameInput = {
  name: string
  path?: string | null
}

export type TraceNameStrategy = {
  id: string
  match: (input: TraceNameInput) => boolean
  render: (input: TraceNameInput) => ReactNode
}
