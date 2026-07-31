import { spanNameStrategies } from "./strategies"
import type { SpanNameInput } from "./types"

type SpanNameProps = SpanNameInput

function resolveStrategy(input: SpanNameInput) {
  return (
    spanNameStrategies.find((strategy) => strategy.match(input)) ??
    spanNameStrategies[spanNameStrategies.length - 1]
  )
}

export function SpanName({ name, attributes, compact }: SpanNameProps) {
  const input = { name, attributes, compact }
  const strategy = resolveStrategy(input)
  return strategy.render(input)
}
