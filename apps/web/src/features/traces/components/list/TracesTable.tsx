import { useNavigate, useSearch } from "@tanstack/react-router"
import { AlertCircleIcon, PanelLeftIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SortableHead } from "@/components/ui/sortable-head"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTimeRange } from "@/features/time-range"
import { useLoadMoreOnScroll } from "@/lib/use-load-more"

import { useTraceFacets } from "../../hooks/useTraceFacets"
import { useTraceFilters } from "../../hooks/useTraceFilters"
import { useTraceSort } from "../../hooks/useTraceSort"
import { useTraces } from "../../hooks/useTraces"
import { TraceDrawer } from "../detail/TraceDrawer"
import { TraceFacetPanel } from "./TraceFacetPanel"
import { TraceFilterBar } from "./TraceFilterBar"
import { TraceTableRow } from "./TraceTableRow"

const FACETS_OPEN_KEY = "lt.traces.facetsOpen"

function readFacetsOpen(): boolean {
  if (typeof window === "undefined") return true
  try {
    const raw = window.localStorage.getItem(FACETS_OPEN_KEY)
    if (raw == null) return true
    return raw === "1" || raw === "true"
  } catch {
    return true
  }
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => (
        <TableRow key={`loading-${index}`} className="hover:bg-transparent">
          <TableCell className="px-3 py-2">
            <Skeleton className="h-3 w-28 rounded-md" />
          </TableCell>
          <TableCell className="px-3 py-2">
            <Skeleton className="h-3 w-24 rounded-md" />
          </TableCell>
          <TableCell className="px-3 py-2">
            <Skeleton className="h-3 w-40 rounded-md" />
          </TableCell>
          <TableCell className="px-3 py-2">
            <Skeleton className="mx-auto h-3 w-12 rounded-md" />
          </TableCell>
          <TableCell className="px-3 py-2">
            <Skeleton className="mx-auto h-3 w-8 rounded-md" />
          </TableCell>
          <TableCell className="px-3 py-2">
            <Skeleton className="mx-auto h-5 w-12 rounded-md" />
          </TableCell>
          <TableCell className="px-3 py-2">
            <Skeleton className="h-3 w-full max-w-[220px] rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function TracesTable() {
  const { query, filters, setQuery, setFilter } = useTraceFilters()
  const { sort, order, setSort } = useTraceSort()
  const { facets, isLoading: facetsLoading } = useTraceFacets()
  const { live, lookbackMs, pausedSince } = useTimeRange()
  const [facetsOpen, setFacetsOpen] = useState(readFacetsOpen)

  useEffect(() => {
    try {
      window.localStorage.setItem(FACETS_OPEN_KEY, facetsOpen ? "1" : "0")
    } catch {
      // ignore quota / private mode
    }
  }, [facetsOpen])

  const listFilters = {
    ...filters,
    sort,
    order,
    // Absolute since only when paused; LIVE slides in queryFn via lookbackMs.
    since: live ? undefined : pausedSince,
  }

  const {
    traces,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useTraces(listFilters, {
    live,
    lookbackMs,
  })
  const { scrollRef, sentinelRef } = useLoadMoreOnScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  })
  const navigate = useNavigate({ from: "/traces" })
  const { trace: selectedTraceId } = useSearch({ from: "/traces" })

  const selectTrace = (traceId: string | null) => {
    void navigate({
      search: (prev) => ({ ...prev, trace: traceId ?? undefined }),
      replace: false,
    })
  }

  return (
    <div className="flex h-full min-h-0 bg-background">
      {facetsOpen ? (
        <TraceFacetPanel
          filters={filters}
          facets={facets}
          isLoading={facetsLoading}
          onSetFilter={setFilter}
          onCollapse={() => setFacetsOpen(false)}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
          {!facetsOpen ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer shrink-0"
              aria-label="Show filters"
              onClick={() => setFacetsOpen(true)}
            >
              <PanelLeftIcon className="size-4" />
            </Button>
          ) : null}
          <div className="min-w-0 flex-1">
            <TraceFilterBar
              query={query}
              onQueryChange={setQuery}
              facets={facets}
            />
          </div>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <AlertCircleIcon className="size-5 text-destructive" />
              <div>
                <p className="text-sm font-medium">Could not load traces</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : (
            <>
            <Table className="text-xs">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="hover:bg-transparent">
                  <SortableHead
                    column="date"
                    label="Date"
                    sort={sort}
                    order={order}
                    onSort={setSort}
                  />
                  <SortableHead
                    column="root_service"
                    label="Root Service"
                    sort={sort}
                    order={order}
                    onSort={setSort}
                  />
                  <SortableHead
                    column="name"
                    label="Name"
                    sort={sort}
                    order={order}
                    onSort={setSort}
                  />
                  <SortableHead
                    column="duration"
                    label="Duration"
                    sort={sort}
                    order={order}
                    onSort={setSort}
                    align="center"
                  />
                  <SortableHead
                    column="spans"
                    label="Spans"
                    sort={sort}
                    order={order}
                    onSort={setSort}
                    align="center"
                  />
                  <SortableHead
                    column="status"
                    label="Status"
                    sort={sort}
                    order={order}
                    onSort={setSort}
                    align="center"
                  />
                  <TableHead className="h-9 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Timeline
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <LoadingRows />
                ) : traces.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={7}
                      className="px-3 py-10 text-center text-sm text-muted-foreground"
                    >
                      {query.trim()
                        ? "No traces match this filter."
                        : "No traces yet. Send OTLP data to start exploring."}
                    </TableCell>
                  </TableRow>
                ) : (
                  traces.map((trace) => (
                    <TraceTableRow
                      key={trace.id}
                      trace={trace}
                      isSelected={selectedTraceId === trace.id}
                      onSelect={selectTrace}
                    />
                  ))
                )}
              </TableBody>
            </Table>
            {isFetchingNextPage ? (
              <p className="px-3 py-3 text-center text-xs text-muted-foreground">
                Loading more…
              </p>
            ) : null}
            <div ref={sentinelRef} className="h-px" />
            </>
          )}
        </div>

        <TraceDrawer
          traceId={selectedTraceId ?? null}
          onOpenChange={(open) => {
            if (!open) selectTrace(null)
          }}
        />
      </div>
    </div>
  )
}
