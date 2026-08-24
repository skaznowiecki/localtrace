import type { AttributeValueStrategy } from "../types"

export const plainStrategy: AttributeValueStrategy = {
  id: "plain",
  match: () => true,
  render: (value) => (
    <span className="break-all whitespace-pre-wrap text-foreground">{value}</span>
  ),
}
