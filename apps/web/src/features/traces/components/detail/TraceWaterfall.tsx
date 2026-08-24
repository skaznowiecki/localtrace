import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { memo, startTransition, useCallback, useMemo, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { useInfiniteScroll } from "../../hooks/useInfiniteScroll"
import { useResizablePanel } from "../../hooks/useResizablePanel"
import { computeCriticalPathIds } from "../../lib/critical-path"
import { resolveSpanVendor } from "../../lib/span-vendor"
import {
  buildSpanTree,
  flattenPackedRows,
  getTraceDurationMs,
} from "../../lib/span-tree"
import type {
  FlatSpanRow,
  Span,
  TraceLog,
  TraceSqlQuery,
  WaterfallRow,
  WaterfallSelection,
} from "../../types"
import { SpanVendorIcon } from "@/components/brand-icons"
import { SpanName } from "../span-name"
import { SpanGroupDetails } from "./SpanGroupDetails"
import { TraceSpanDetails, type SpanDetailsTab } from "./TraceSpanDetails"
import {
  TraceTimeGrid,
  TraceTimeRuler,
  WATERFALL_GRID,
} from "./TraceTimeRuler"
import { WaterfallSpanBar } from "./WaterfallSpanBar"
import { WaterfallToolbar, type TraceViewMode } from "./WaterfallToolbar"
import { TraceSpanNameStats } from "./TraceSpanNameStats"

const WATERFALL_PAGE_SIZE = 80

type TraceWaterfallProps = {
  spans: Span[]
  logs?: TraceLog[]
  logsLoading?: boolean
  sqlQueries?: TraceSqlQuery[]
  sqlLoading?: boolean
}

type WaterfallRowViewProps = {
  row: WaterfallRow
  totalDurationMs: number
  selection: WaterfallSelection
  criticalPathEnabled: boolean
  criticalPathIds: Set<string>
  onSelect: (span: FlatSpanRow) => void
  onToggleExpanded: (spanId: string) => void
  onToggleGroup: (groupId: string) => void
}

function rowIsSelected(row: WaterfallRow, selection: WaterfallSelection): boolean {
  return row.laneSpans.some((span) => {
    if (selection.kind === "group") {
      return span.group?.groupId === selection.group.groupId
    }
    return span.id === selection.spanId
  })
}

function isSpanSelected(span: FlatSpanRow, selection: WaterfallSelection): boolean {
  if (selection.kind === "group") {
    return span.group?.groupId === selection.group.groupId
  }
  return span.id === selection.spanId
}

function rowSelectionFingerprint(
  row: WaterfallRow,
  selection: WaterfallSelection,
): string {
  return row.laneSpans
    .map((span) => (isSpanSelected(span, selection) ? "1" : "0"))
    .join("")
}

function isSpanOnCriticalPath(
  span: FlatSpanRow,
  criticalPathIds: Set<string>,
): boolean {
  if (span.group) {
    return span.group.members.some((member) => criticalPathIds.has(member.id))
  }
  return criticalPathIds.has(span.id)
}

const WaterfallRowView = memo(
  function WaterfallRowView({
    row,
    totalDurationMs,
    selection,
    criticalPathEnabled,
    criticalPathIds,
    onSelect,
    onToggleExpanded,
    onToggleGroup,
  }: WaterfallRowViewProps) {
    const rowSelected = rowIsSelected(row, selection)
    const hasGroupChevron = row.expandGroupId != null
    const hasSpanChevron = row.expandSpanId != null && !hasGroupChevron
    const chevronExpanded = hasGroupChevron
      ? row.isGroupExpanded
      : row.isExpanded
    const namedSpan = row.laneSpans[0]
    const vendor = namedSpan ? resolveSpanVendor(namedSpan) : null

    return (
      <div
        className={cn(
          WATERFALL_GRID,
          "border-b border-border/50 hover:bg-muted/30",
          rowSelected && "bg-muted/40",
        )}
      >
        <div className="flex items-center justify-center">
          <button
            type="button"
            className={cn(
              "inline-flex size-5 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !hasGroupChevron && !hasSpanChevron && "pointer-events-none opacity-0",
            )}
            aria-label={
              hasGroupChevron
                ? chevronExpanded
                  ? "Collapse group"
                  : "Expand group"
                : chevronExpanded
                  ? "Collapse span"
                  : "Expand span"
            }
            onClick={(event) => {
              event.stopPropagation()
              if (row.expandGroupId) {
                onToggleGroup(row.expandGroupId)
              } else if (row.expandSpanId) {
                onToggleExpanded(row.expandSpanId)
              }
            }}
          >
            {chevronExpanded ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronRightIcon className="size-3.5" />
            )}
          </button>
        </div>

        <div
          className="flex min-w-0 items-center gap-1.5 pr-2"
          style={{ paddingLeft: `${4 + row.depth * 10}px` }}
        >
          {vendor ? (
            <SpanVendorIcon vendor={vendor} className="size-3.5" />
          ) : null}
          {namedSpan ? (
            <button
              type="button"
              className="min-w-0 cursor-pointer truncate text-left text-[11px] text-foreground"
              onClick={() => onSelect(namedSpan)}
            >
              {namedSpan.group ? (
                <span className="block truncate" title={namedSpan.group.name}>
                  {namedSpan.group.name}{" "}
                  <span className="text-muted-foreground">
                    ×{namedSpan.group.count}
                  </span>
                </span>
              ) : (
                <SpanName
                  name={namedSpan.name}
                  attributes={namedSpan.attributes}
                  compact
                />
              )}
            </button>
          ) : null}
        </div>

        <div className="relative px-2 py-1.5">
          <div className="relative h-7">
            {row.laneSpans.map((span) => (
              <WaterfallSpanBar
                key={span.id}
                span={span}
                totalDurationMs={totalDurationMs}
                isSelected={isSpanSelected(span, selection)}
                muted={
                  criticalPathEnabled &&
                  !isSpanOnCriticalPath(span, criticalPathIds)
                }
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    )
  },
  (prev, next) =>
    prev.row === next.row &&
    prev.totalDurationMs === next.totalDurationMs &&
    prev.criticalPathEnabled === next.criticalPathEnabled &&
    prev.criticalPathIds === next.criticalPathIds &&
    prev.onSelect === next.onSelect &&
    prev.onToggleExpanded === next.onToggleExpanded &&
    prev.onToggleGroup === next.onToggleGroup &&
    rowSelectionFingerprint(prev.row, prev.selection) ===
      rowSelectionFingerprint(next.row, next.selection),
)

export function TraceWaterfall({
  spans,
  logs = [],
  logsLoading = false,
  sqlQueries = [],
  sqlLoading = false,
}: TraceWaterfallProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>()
    for (const span of spans) {
      if (span.parentId) {
        ids.add(span.parentId)
      }
    }
    return ids
  })
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [criticalPathEnabled, setCriticalPathEnabled] = useState(true)
  const [view, setView] = useState<TraceViewMode>("waterfall")

  const totalDurationMs = useMemo(() => getTraceDurationMs(spans), [spans])
  const roots = useMemo(() => buildSpanTree(spans), [spans])
  const criticalPathIds = useMemo(
    () => computeCriticalPathIds(roots, totalDurationMs),
    [roots, totalDurationMs],
  )
  const rows = useMemo(
    () => flattenPackedRows(roots, expandedIds, expandedGroupIds),
    [roots, expandedIds, expandedGroupIds],
  )

  const [selection, setSelection] = useState<WaterfallSelection>(() => ({
    kind: "span",
    spanId: roots[0]?.id ?? spans[0]?.id ?? "",
  }))
  const [activeTab, setActiveTab] = useState<SpanDetailsTab>("overview")
  const [logSpanFilter, setLogSpanFilter] = useState<string | null>(null)
  const [sqlSpanFilter, setSqlSpanFilter] = useState<string | null>(null)

  const selectedSpan = useMemo(() => {
    if (selection.kind !== "span") return null
    return spans.find((span) => span.id === selection.spanId) ?? null
  }, [spans, selection])

  const selectFlatSpan = useCallback((span: FlatSpanRow) => {
    startTransition(() => {
      if (span.group) {
        setSelection({ kind: "group", group: span.group })
        return
      }
      setSelection({ kind: "span", spanId: span.id })
      // Keep DB/Logs filters in sync with selection so switching tabs
      // shows the selected span's related queries/logs.
      setLogSpanFilter(span.id)
      setSqlSpanFilter(span.id)
    })
  }, [])

  const selectMember = useCallback((spanId: string) => {
    startTransition(() => {
      setSelection({ kind: "span", spanId })
      setLogSpanFilter(spanId)
      setSqlSpanFilter(spanId)
    })
  }, [])

  const { visibleItems, hasMore, scrollRef, sentinelRef } = useInfiniteScroll(
    rows,
    WATERFALL_PAGE_SIZE,
  )

  const {
    containerRef,
    fraction: detailsFraction,
    isDragging,
    onDragStart,
  } = useResizablePanel({
    initialFraction: 0.55,
    minFraction: 0.15,
    maxFraction: 0.8,
  })

  const toggleExpanded = useCallback((spanId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(spanId)) {
        next.delete(spanId)
      } else {
        next.add(spanId)
      }
      return next
    })
  }, [])

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroupIds((current) => {
      const next = new Set(current)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  if (spans.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        No spans in this trace.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        isDragging && "cursor-row-resize select-none",
      )}
    >
      <WaterfallToolbar
        view={view}
        onViewChange={setView}
        criticalPathEnabled={criticalPathEnabled}
        onCriticalPathChange={setCriticalPathEnabled}
        criticalPathCount={criticalPathIds.size}
      />

      {view === "stats" ? (
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-4 py-3",
            isDragging && "pointer-events-none",
          )}
        >
          <TraceSpanNameStats
            spans={spans}
            selectedSpanId={selection.kind === "span" ? selection.spanId : null}
            onSelectSpan={selectMember}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TraceTimeRuler totalDurationMs={totalDurationMs} />

          <div
            ref={scrollRef}
            className={cn(
              "relative min-h-0 flex-1 overflow-y-auto",
              isDragging && "pointer-events-none",
            )}
          >
            <TraceTimeGrid totalDurationMs={totalDurationMs} />

            <div className="relative">
              {visibleItems.map((row) => (
                <WaterfallRowView
                  key={row.id}
                  row={row}
                  totalDurationMs={totalDurationMs}
                  selection={selection}
                  criticalPathEnabled={criticalPathEnabled}
                  criticalPathIds={criticalPathIds}
                  onSelect={selectFlatSpan}
                  onToggleExpanded={toggleExpanded}
                  onToggleGroup={toggleGroup}
                />
              ))}

              {hasMore ? (
                <>
                  {Array.from({ length: 3 }, (_, index) => (
                    <div
                      key={`waterfall-loading-${index}`}
                      className={cn(
                        WATERFALL_GRID,
                        "border-b border-border/50 px-2 py-2",
                      )}
                    >
                      <div />
                      <Skeleton className="h-4 w-24 rounded-md" />
                      <Skeleton className="h-7 w-full rounded-md" />
                    </div>
                  ))}
                  <div ref={sentinelRef} className="h-px w-full" aria-hidden />
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {selection.kind === "group" || selectedSpan ? (
        <>
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize details panel"
            onPointerDown={onDragStart}
            className={cn(
              "group relative flex h-1.5 shrink-0 cursor-row-resize items-center justify-center border-y border-border/50 bg-border/40 transition-colors hover:bg-primary/40",
              isDragging && "bg-primary/60",
            )}
          >
            <span
              className={cn(
                "h-0.5 w-8 rounded-full bg-muted-foreground/40 transition-colors group-hover:bg-primary",
                isDragging && "bg-primary",
              )}
            />
          </div>
          <div
            className="min-h-0 shrink-0 overflow-hidden"
            style={{ height: `${detailsFraction * 100}%` }}
          >
            {selection.kind === "group" ? (
              <SpanGroupDetails
                group={selection.group}
                onSelectMember={selectMember}
              />
            ) : selectedSpan ? (
              <TraceSpanDetails
                span={selectedSpan}
                spans={spans}
                logs={logs}
                logsLoading={logsLoading}
                sqlQueries={sqlQueries}
                sqlLoading={sqlLoading}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                logSpanFilter={logSpanFilter}
                onClearLogSpanFilter={() => setLogSpanFilter(null)}
                sqlSpanFilter={sqlSpanFilter}
                onClearSqlSpanFilter={() => setSqlSpanFilter(null)}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}
