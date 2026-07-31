import type { SpanNameStrategy } from "../types"

export const plainStrategy: SpanNameStrategy = {
  id: "plain",
  match: () => true,
  render: (input) => (
    <span className="block truncate" title={input.name}>
      {input.name}
    </span>
  ),
}
