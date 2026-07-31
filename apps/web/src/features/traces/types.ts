export type TraceStatus = "ok" | "error" | "unset"

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type TraceListItem = {
  id: string
  service: string
  rootService: string
  name: string
  durationMs: number
  spanCount: number
  status: TraceStatus
  /** HTTP response status from the root span (enriched on the frontend from detail). */
  httpStatusCode: string | null
  /**
   * Full request URL from root-span attributes when `name` is method-only
   * (e.g. OPTIONS). Frontend enrichment only — not a backend field.
   */
  httpUrl: string | null
  startTime: string
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
