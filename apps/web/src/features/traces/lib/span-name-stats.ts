import { getSpanColor } from "../service-colors"
import type { Span } from "../types"
import { spanDisplayLabel } from "./span-display"

export type SpanNameStat = {
  name: string
  count: number
  /** Sum of exclusive (self) time — wall duration minus direct children. */
  totalMs: number
  avgMs: number
  /** Share of exclusive time across the trace (0–100). */
  pct: number
  color: string
  primaryService: string
  /** IDs of every span aggregated into this row. */
  spanIds: string[]
  /** Span with the greatest exclusive time — the one to select on click. */
  representativeSpanId: string
}

type Acc = {
  name: string
  count: number
  totalMs: number
  /** service → count of spans with this name from that service */
  serviceCounts: Map<string, number>
  spanIds: string[]
  representativeSpanId: string
  bestExclusiveMs: number
}

function primaryService(serviceCounts: Map<string, number>): string {
  let best = ""
  let bestCount = -1
  for (const [service, count] of serviceCounts) {
    if (count > bestCount) {
      best = service
      bestCount = count
    }
  }
  return best || "unknown_service"
}

/**
 * Exclusive / self time: wall duration minus sum of direct children.
 * Parent envelopes (HTTP handlers wrapping AI/DB) get ~0 so they don't
 * inflate "where did the time go" percentages.
 */
function exclusiveDurationMs(
  span: Span,
  childDurationSumByParent: Map<string, number>,
): number {
  const childSum = childDurationSumByParent.get(span.id) ?? 0
  return Math.max(0, span.durationMs - childSum)
}

export function aggregateSpanNameStats(spans: Span[]): SpanNameStat[] {
  if (spans.length === 0) return []

  const childDurationSumByParent = new Map<string, number>()
  for (const span of spans) {
    if (!span.parentId) continue
    childDurationSumByParent.set(
      span.parentId,
      (childDurationSumByParent.get(span.parentId) ?? 0) + span.durationMs,
    )
  }

  const byName = new Map<string, Acc>()
  let grandTotalMs = 0

  for (const span of spans) {
    const exclusiveMs = exclusiveDurationMs(span, childDurationSumByParent)
    grandTotalMs += exclusiveMs

    const label = spanDisplayLabel(span)
    const existing = byName.get(label)
    if (existing) {
      existing.count += 1
      existing.totalMs += exclusiveMs
      existing.spanIds.push(span.id)
      if (exclusiveMs > existing.bestExclusiveMs) {
        existing.bestExclusiveMs = exclusiveMs
        existing.representativeSpanId = span.id
      }
      existing.serviceCounts.set(
        span.service,
        (existing.serviceCounts.get(span.service) ?? 0) + 1,
      )
    } else {
      byName.set(label, {
        name: label,
        count: 1,
        totalMs: exclusiveMs,
        serviceCounts: new Map([[span.service, 1]]),
        spanIds: [span.id],
        representativeSpanId: span.id,
        bestExclusiveMs: exclusiveMs,
      })
    }
  }

  const stats: SpanNameStat[] = []
  for (const acc of byName.values()) {
    // Skip pure wrappers that contributed no exclusive time.
    if (acc.totalMs <= 0) continue

    const pct = grandTotalMs > 0 ? (acc.totalMs / grandTotalMs) * 100 : 0
    // Hide noise that would display as 0% (middleware, empty routers, etc.).
    if (Math.round(pct) < 1) continue

    const service = primaryService(acc.serviceCounts)
    stats.push({
      name: acc.name,
      count: acc.count,
      totalMs: acc.totalMs,
      avgMs: acc.count > 0 ? acc.totalMs / acc.count : 0,
      pct,
      primaryService: service,
      color: getSpanColor(service, acc.name),
      spanIds: acc.spanIds,
      representativeSpanId: acc.representativeSpanId,
    })
  }

  stats.sort((a, b) => b.totalMs - a.totalMs)
  return stats
}
