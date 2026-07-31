import {
  groupSiblingRuns,
  isSpanGroupNode,
  type SiblingItem,
  type SpanGroupNode,
} from "./span-groups"
import type { FlatSpanRow, Span, SpanTreeNode, WaterfallRow } from "../types"

const PACK_EPSILON_MS = 0.01

export function buildSpanTree(spans: Span[]): SpanTreeNode[] {
  const nodes = new Map<string, SpanTreeNode>()
  const roots: SpanTreeNode[] = []

  for (const span of spans) {
    nodes.set(span.id, { ...span, children: [], depth: 0 })
  }

  for (const span of spans) {
    const node = nodes.get(span.id)
    if (!node) continue

    if (span.parentId && nodes.has(span.parentId)) {
      const parent = nodes.get(span.parentId)
      parent?.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const assignDepth = (node: SpanTreeNode, depth: number) => {
    node.depth = depth
    for (const child of node.children) {
      assignDepth(child, depth + 1)
    }
  }

  const sortChildren = (node: SpanTreeNode) => {
    node.children.sort((a, b) => a.startOffsetMs - b.startOffsetMs)
    for (const child of node.children) {
      sortChildren(child)
    }
  }

  roots.sort((a, b) => a.startOffsetMs - b.startOffsetMs)
  for (const root of roots) {
    assignDepth(root, 0)
    sortChildren(root)
  }

  return roots
}

function toFlatSpan(node: SpanTreeNode, expandedIds: Set<string>): FlatSpanRow {
  return {
    ...node,
    hasChildren: node.children.length > 0,
    isExpanded: expandedIds.has(node.id),
  }
}

function toGroupFlatSpan(group: SpanGroupNode): FlatSpanRow {
  return {
    id: group.id,
    parentId: group.parentId,
    name: group.name,
    service: group.service,
    kind: 0,
    status: group.status,
    statusMessage: null,
    startOffsetMs: group.startOffsetMs,
    durationMs: group.durationMs,
    attributes: {},
    events: [],
    links: [],
    resourceAttributes: {},
    scopeName: null,
    scopeVersion: null,
    children: [],
    depth: group.depth,
    hasChildren: true,
    isExpanded: false,
    group: group.meta,
  }
}

function packSiblings(siblings: SpanTreeNode[]): SpanTreeNode[][] {
  const sorted = [...siblings].sort((a, b) => a.startOffsetMs - b.startOffsetMs)
  const lanes: SpanTreeNode[][] = []
  const laneEnds: number[] = []

  for (const sibling of sorted) {
    const start = sibling.startOffsetMs
    const end = sibling.startOffsetMs + sibling.durationMs
    const hasChildren = sibling.children.length > 0

    let placed = false
    for (let index = 0; index < lanes.length; index += 1) {
      if (laneEnds[index] > start - PACK_EPSILON_MS) continue
      if (hasChildren && lanes[index].some((span) => span.children.length > 0)) {
        continue
      }

      lanes[index].push(sibling)
      laneEnds[index] = end
      placed = true
      break
    }

    if (!placed) {
      lanes.push([sibling])
      laneEnds.push(end)
    }
  }

  return lanes
}

function emitSpanLanes(
  siblings: SpanTreeNode[],
  expandedIds: Set<string>,
  expandedGroupIds: Set<string>,
  rows: WaterfallRow[],
) {
  const lanes = packSiblings(siblings)

  for (const lane of lanes) {
    const laneSpans = lane.map((node) => toFlatSpan(node, expandedIds))
    const expandTarget = laneSpans.find((span) => span.hasChildren) ?? null

    rows.push({
      id: lane.map((span) => span.id).join("|"),
      depth: lane[0]?.depth ?? 0,
      laneSpans,
      expandSpanId: expandTarget?.id ?? null,
      isExpanded: expandTarget ? expandTarget.isExpanded : false,
      expandGroupId: null,
      isGroupExpanded: false,
    })

    for (const span of lane) {
      if (expandedIds.has(span.id) && span.children.length > 0) {
        emitPackedSiblings(span.children, expandedIds, expandedGroupIds, rows)
      }
    }
  }
}

function emitPackedSiblings(
  siblings: SpanTreeNode[],
  expandedIds: Set<string>,
  expandedGroupIds: Set<string>,
  rows: WaterfallRow[],
) {
  const items: SiblingItem[] = groupSiblingRuns(siblings)

  // Collect consecutive non-group spans so packing still works across them.
  let pendingSpans: SpanTreeNode[] = []

  const flushPending = () => {
    if (pendingSpans.length === 0) return
    emitSpanLanes(pendingSpans, expandedIds, expandedGroupIds, rows)
    pendingSpans = []
  }

  for (const item of items) {
    if (isSpanGroupNode(item)) {
      flushPending()

      const groupExpanded = expandedGroupIds.has(item.id)
      rows.push({
        id: item.id,
        depth: item.depth,
        laneSpans: [toGroupFlatSpan(item)],
        expandSpanId: null,
        isExpanded: false,
        expandGroupId: item.id,
        isGroupExpanded: groupExpanded,
      })

      if (groupExpanded) {
        emitSpanLanes(item.members, expandedIds, expandedGroupIds, rows)
      }
      continue
    }

    pendingSpans.push(item)
  }

  flushPending()
}

export function flattenPackedRows(
  roots: SpanTreeNode[],
  expandedIds: Set<string>,
  expandedGroupIds: Set<string> = new Set(),
): WaterfallRow[] {
  const rows: WaterfallRow[] = []
  if (roots.length === 0) return rows
  emitPackedSiblings(roots, expandedIds, expandedGroupIds, rows)
  return rows
}

/** @deprecated Prefer flattenPackedRows for the waterfall UI */
export function flattenSpanTree(
  roots: SpanTreeNode[],
  expandedIds: Set<string>,
): FlatSpanRow[] {
  const rows: FlatSpanRow[] = []

  const walk = (node: SpanTreeNode) => {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedIds.has(node.id)

    rows.push({
      ...node,
      hasChildren,
      isExpanded,
    })

    if (hasChildren && isExpanded) {
      for (const child of node.children) {
        walk(child)
      }
    }
  }

  for (const root of roots) {
    walk(root)
  }

  return rows
}

export function getTraceDurationMs(spans: Span[]): number {
  if (spans.length === 0) return 0

  return spans.reduce(
    (max, span) => Math.max(max, span.startOffsetMs + span.durationMs),
    0,
  )
}
