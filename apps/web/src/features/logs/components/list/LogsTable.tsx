import { useNavigate, useSearch } from "@tanstack/react-router"
import { AlertCircleIcon, PanelLeftIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTraceTimeRange } from "@/features/traces"

import { useLogFacets } from "../../hooks/useLogFacets"
import { useLogFilters } from "../../hooks/useLogFilters"
import { useLogSort } from "../../hooks/useLogSort"
import { useLogs } from "../../hooks/useLogs"
import { LogDrawer } from "../detail/LogDrawer"
import { LogFacetPanel } from "./LogFacetPanel"
import { LogFilterBar } from "./LogFilterBar"
import { LogTableRow } from "./LogTableRow"
import { SortableHead } from "./SortableHead"

const FACETS_OPEN_KEY = "lt.logs.facetsOpen"

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
            <Skeleton className="h-3 w-14 rounded-md" />
          </TableCell>
          <TableCell className="px-3 py-2">
            <Skeleton className="h-3 w-64 rounded-md" />
          </TableCell>
          <TableCell className="px-3 py-2">
            <Skeleton className="h-3 w-16 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function LogsTable() {
  const [facetsOpen, setFacetsOpen] = useState(readFacetsOpen)
  const { query, filters, setQuery, setFilter } = useLogFilters()
  const { sort, order, setSort } = useLogSort()
  const { facets, isLoading: facetsLoading } = useLogFacets()
  const { live, lookbackMs, pausedSince } = useTraceTimeRange()

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
    since: live ? undefined : pausedSince,
  }

  const { logs, isLoading, error } = useLogs(listFilters, {
    live,
    lookbackMs,
  })

  const navigate = useNavigate({ from: "/logs" })
  const { log: selectedLogId } = useSearch({ from: "/logs" })
  const selectedLog =
    selectedLogId != null
      ? (logs.find((log) => log.id === selectedLogId) ?? null)
      : null

  const selectLog = (logId: string | null) => {
    void navigate({
      search: (prev) => ({ ...prev, log: logId ?? undefined }),
      replace: false,
    })
  }

  return (
    <div className="flex h-full min-h-0 bg-background">
      {facetsOpen ? (
        <LogFacetPanel
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
            <LogFilterBar
              query={query}
              onQueryChange={setQuery}
              facets={facets}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <AlertCircleIcon className="size-5 text-destructive" />
              <div>
                <p className="text-sm font-medium">Could not load logs</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : (
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
                    column="service"
                    label="Service"
                    sort={sort}
                    order={order}
                    onSort={setSort}
                  />
                  <SortableHead
                    column="severity"
                    label="Severity"
                    sort={sort}
                    order={order}
                    onSort={setSort}
                  />
                  <TableHead className="h-9 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Message
                  </TableHead>
                  <TableHead className="h-9 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Trace
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <LoadingRows />
                ) : logs.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={5}
                      className="px-3 py-10 text-center text-sm text-muted-foreground"
                    >
                      {query.trim()
                        ? "No logs match this filter."
                        : "No logs yet. Send OTLP data to start exploring."}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <LogTableRow
                      key={log.id}
                      log={log}
                      isSelected={selectedLogId === log.id}
                      onSelect={selectLog}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <LogDrawer
          log={selectedLog}
          onOpenChange={(open) => {
            if (!open) selectLog(null)
          }}
        />
      </div>
    </div>
  )
}
