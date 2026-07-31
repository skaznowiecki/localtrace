import type { SpanTreeNode } from "../types"

const NOISE_NAME = /^(middleware|prisma:|router -)/

function isNoise(node: SpanTreeNode): boolean {
  return NOISE_NAME.test(node.name)
}

function endMs(node: SpanTreeNode): number {
  return node.startOffsetMs + node.durationMs
}

/**
 * Hybrid critical-path for waterfall highlighting.
 *
 * 1. Walk root → leaf picking the latest-ending non-noise child at each step
 *    (fallback to all children if every child is noise).
 * 2. For each node on that chain, also include "dominant" siblings whose
 *    duration is ≥ max(100ms, 5% of total trace duration).
 * 3. Always keep error spans (and their ancestors) so punctual failures stay
 *    visible even when Critical path filtering is on.
 */
export function computeCriticalPathIds(
  roots: SpanTreeNode[],
  totalDurationMs: number,
): Set<string> {
  const ids = new Set<string>()
  if (roots.length === 0) return ids

  const root =
    roots.length === 1
      ? roots[0]!
      : roots.reduce((best, node) => (endMs(node) > endMs(best) ? node : best))

  const chain: SpanTreeNode[] = []
  let current: SpanTreeNode | null = root

  while (current) {
    chain.push(current)
    ids.add(current.id)

    const children: SpanTreeNode[] = current.children
    if (children.length === 0) break

    const candidates: SpanTreeNode[] = children.filter(
      (child) => !isNoise(child),
    )
    const pool: SpanTreeNode[] =
      candidates.length > 0 ? candidates : children
    current = pool.reduce((best, node) =>
      endMs(node) > endMs(best) ? node : best,
    )
  }

  const threshold = Math.max(100, totalDurationMs * 0.05)

  for (const node of chain) {
    for (const child of node.children) {
      if (child.durationMs >= threshold) {
        ids.add(child.id)
      }
    }
  }

  includeErrorSpanChains(roots, ids)

  return ids
}

/** Keep failing spans + ancestors so errors aren't hidden by critical-path filter. */
function includeErrorSpanChains(
  roots: SpanTreeNode[],
  ids: Set<string>,
): void {
  const byId = new Map<string, SpanTreeNode>()

  function index(node: SpanTreeNode) {
    byId.set(node.id, node)
    for (const child of node.children) index(child)
  }

  function visit(node: SpanTreeNode) {
    if (node.status === "error") {
      let current: SpanTreeNode | undefined = node
      while (current) {
        ids.add(current.id)
        current = current.parentId
          ? byId.get(current.parentId)
          : undefined
      }
    }
    for (const child of node.children) visit(child)
  }

  for (const root of roots) index(root)
  for (const root of roots) visit(root)
}
