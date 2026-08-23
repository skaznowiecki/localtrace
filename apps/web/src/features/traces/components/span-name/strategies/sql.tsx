import { compactSqlLabel } from "../../../lib/span-display"
import type { SpanNameStrategy } from "../types"

export const sqlStrategy: SpanNameStrategy = {
  id: "sql",
  match: (input) => compactSqlLabel(input.name) != null,
  render: (input) => {
    const label = compactSqlLabel(input.name) ?? input.name
    return (
      <span className="block truncate font-mono text-[12px]" title={input.name}>
        {label}
      </span>
    )
  },
}
