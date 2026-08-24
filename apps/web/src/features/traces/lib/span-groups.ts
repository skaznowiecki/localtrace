import type { Span, SpanGroupMeta, SpanTreeNode } from "../types"
import { spanDisplayLabel } from "./span-display"

export type SpanGroupNode = {
  kind: "group"
  id: string
  name: string
  parentId: string | null
  service: string
  status: Span["status"]
  startOffsetMs: number
  durationMs: number
  depth: number
  children: []
  members: SpanTreeNode[]
  meta: SpanGroupMeta
}

export type SiblingItem = SpanTreeNode | SpanGroupNode

export function isSpanGroupNode(item: SiblingItem): item is SpanGroupNode {
  return "kind" in item && item.kind === "group"
}

function toSpanSnapshot(node: SpanTreeNode): Span {
  const {
    children: _children,
    depth: _depth,
    ...span
  } = node
  return span
}

function buildGroupMeta(members: SpanTreeNode[], groupId: string): SpanGroupMeta {
  const totalDurationMs = members.reduce((sum, m) => sum + m.durationMs, 0)
  const maxDurationMs = members.reduce(
    (max, m) => Math.max(max, m.durationMs),
    0,
  )
  const count = members.length

  return {
    groupId,
    name: spanDisplayLabel(members[0]!),
    members: members.map(toSpanSnapshot),
    count,
    totalDurationMs,
    avgDurationMs: count > 0 ? totalDurationMs / count : 0,
    maxDurationMs,
  }
}

function makeGroupNode(members: SpanTreeNode[]): SpanGroupNode {
  const first = members[0]!
  const startOffsetMs = Math.min(...members.map((m) => m.startOffsetMs))
  const endMs = Math.max(
    ...members.map((m) => m.startOffsetMs + m.durationMs),
  )
  const parentId = first.parentId
  const label = spanDisplayLabel(first)
  const groupId = `group:${parentId ?? "root"}:${label}:${startOffsetMs}`
  const hasError = members.some((m) => m.status === "error")

  return {
    kind: "group",
    id: groupId,
    name: label,
    parentId,
    service: first.service,
    status: hasError ? "error" : first.status,
    startOffsetMs,
    durationMs: Math.max(endMs - startOffsetMs, 0),
    depth: first.depth,
    children: [],
    members,
    meta: buildGroupMeta(members, groupId),
  }
}

/**
 * Run-length encode consecutive leaf siblings that share the same display label.
 * Groups of size ≥ 2 become `SpanGroupNode`; parents and singletons pass through.
 * Input must already be sorted by `startOffsetMs`.
 */
export function groupSiblingRuns(siblings: SpanTreeNode[]): SiblingItem[] {
  if (siblings.length === 0) return []

  const result: SiblingItem[] = []
  let runStart = 0

  for (let index = 1; index <= siblings.length; index += 1) {
    const prev = siblings[runStart]!
    const atEnd = index === siblings.length
    const nameChanged =
      !atEnd && spanDisplayLabel(siblings[index]!) !== spanDisplayLabel(prev)

    if (!atEnd && !nameChanged) continue

    const run = siblings.slice(runStart, index)
    // Only collapse leaf runs. Grouping parents (prisma:client:operation)
    // hides their SQL / engine children until the group is expanded.
    const leafRun = run.every((node) => node.children.length === 0)
    if (run.length >= 2 && leafRun) {
      result.push(makeGroupNode(run))
    } else {
      result.push(...run)
    }
    runStart = index
  }

  return result
}
