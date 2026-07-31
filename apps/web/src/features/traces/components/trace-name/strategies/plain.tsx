import type { TraceNameStrategy } from "../types"

export const plainStrategy: TraceNameStrategy = {
  id: "plain",
  match: () => true,
  render: (input) => (
    <span className="block truncate" title={input.name}>
      {input.name}
    </span>
  ),
}
