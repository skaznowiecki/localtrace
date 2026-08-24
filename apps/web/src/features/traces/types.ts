import type { JsonValue } from "@/lib/json"

export type { JsonValue }

export type TraceStatus = "ok" | "error" | "unset"

export type TraceListItem = {
  id: string
  service: string
  rootService: string
  name: string
  durationMs: number
  spanCount: number
  status: TraceStatus
  httpStatusCode: string | null
  httpMethod: string | null
  /** Absolute request URL from the root span. */
  httpUrl: string | null
  /** Normalized route (e.g. `/users/:id`) for list display. */
  httpRoute: string | null
  startTime: string
  breakdown: TraceBreakdownItem[] | null
}

export type TraceBreakdownItem = {
  name: string
  durationMs: number
  share: number
}

export type Span = {
  id: string
  parentId: string | null
  name: string
  service: string
  kind: number
  status: TraceStatus
  statusMessage: string | null
  startOffsetMs: number
  durationMs: number
  attributes: JsonValue
  events: JsonValue
  links: JsonValue
  resourceAttributes: JsonValue
  scopeName: string | null
  scopeVersion: string | null
  type: string | null
  payloadPath: string | null
  provider: string | null
}

export type TraceDetail = {
  trace: TraceListItem
  spans: Span[]
}

export type TraceLog = {
  id: string
  time: string
  severityNumber: number | null
  severityText: string | null
  body: JsonValue
  service: string
  attributes: JsonValue
  scopeName: string | null
  scopeVersion: string | null
  traceId: string | null
  spanId: string | null
  provider: string | null
}

export type TraceSqlQuery = {
  spanId: string
  name: string
  statement: string
  durationMs: number
  startOffsetMs: number
  startedAt: string | null
  dbSystem: string | null
  host: string | null
  status: TraceStatus
  share: number
}

export type SpanTreeNode = Span & {
  children: SpanTreeNode[]
  depth: number
}

export type SpanGroupMeta = {
  groupId: string
  name: string
  members: Span[]
  count: number
  totalDurationMs: number
  avgDurationMs: number
  maxDurationMs: number
}

export type FlatSpanRow = SpanTreeNode & {
  hasChildren: boolean
  isExpanded: boolean
  /** Present when this row represents a collapsed consecutive sibling group. */
  group?: SpanGroupMeta
}

export type WaterfallRow = {
  id: string
  depth: number
  laneSpans: FlatSpanRow[]
  expandSpanId: string | null
  isExpanded: boolean
  expandGroupId: string | null
  isGroupExpanded: boolean
}

/** Waterfall selection — groups use synthetic IDs not present in `spans[]`. */
export type WaterfallSelection =
  | { kind: "span"; spanId: string }
  | { kind: "group"; group: SpanGroupMeta }
