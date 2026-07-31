import { traceNameStrategies } from "./strategies"
import type { TraceNameInput } from "./types"

type TraceNameProps = TraceNameInput

function resolveStrategy(input: TraceNameInput) {
  return (
    traceNameStrategies.find((strategy) => strategy.match(input)) ??
    traceNameStrategies[traceNameStrategies.length - 1]
  )
}

export function TraceName({ name, path }: TraceNameProps) {
  const input = { name, path }
  const strategy = resolveStrategy(input)
  return strategy.render(input)
}
