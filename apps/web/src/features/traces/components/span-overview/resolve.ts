import type { Span } from "../../types"
import type { SpanOverviewStrategy } from "./types"
import { spanOverviewStrategies } from "./strategies"

export function resolveSpanOverview(
  span: Span,
): SpanOverviewStrategy | null {
  return spanOverviewStrategies.find((strategy) => strategy.match(span)) ?? null
}
