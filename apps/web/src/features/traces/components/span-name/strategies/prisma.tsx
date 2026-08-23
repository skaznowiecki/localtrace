import { prismaOperationLabel } from "../../../lib/span-display"
import type { SpanNameStrategy } from "../types"

export const prismaStrategy: SpanNameStrategy = {
  id: "prisma",
  match: (input) => input.name === "prisma:client:operation",
  render: (input) => {
    const label =
      prismaOperationLabel({
        name: input.name,
        attributes: input.attributes ?? {},
      }) ?? input.name
    return (
      <span className="block truncate font-mono text-[12px]" title={label}>
        {label}
      </span>
    )
  },
}
