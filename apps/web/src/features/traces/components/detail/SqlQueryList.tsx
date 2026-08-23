import {
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  CopyIcon,
  DatabaseIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { memo, useEffect, useMemo, useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { useInfiniteScroll } from "../../hooks/useInfiniteScroll"
import type { Span, TraceSqlQuery } from "../../types"
import { highlightSql } from "../attribute-value/strategies/sql"

type SqlQueryListProps = {
  queries: TraceSqlQuery[]
  spans: Span[]
  spanFilter: string | null
  onClearSpanFilter: () => void
  isLoading?: boolean
}

const QUERY_PAGE_SIZE = 40

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function formatQueryDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatQueryWhen(iso: string): string {
  const date = new Date(iso)
  const month = MONTHS[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  let hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")
  const ms = String(date.getMilliseconds()).padStart(3, "0")
  const ampm = hours >= 12 ? "pm" : "am"
  hours = hours % 12 || 12

  return `${month} ${day}, ${year} at ${hours}:${minutes}:${seconds}.${ms} ${ampm}`
}

function queryMeta(query: TraceSqlQuery): string {
  return query.dbSystem ?? query.host ?? query.name
}

function matchesQuery(query: TraceSqlQuery, needle: string): boolean {
  if (!needle) return true
  const haystack = [
    query.statement,
    query.name,
    query.dbSystem,
    query.host,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase()
  return haystack.includes(needle)
}

function CopyQueryButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timeout)
  }, [copied])

  return (
    <button
      type="button"
      className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
      aria-label={copied ? "Copied" : "Copy query"}
      onClick={(event) => {
        event.stopPropagation()
        void navigator.clipboard.writeText(value).then(() => setCopied(true))
      }}
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-emerald-600" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </button>
  )
}

function MetaSep() {
  return <span className="text-border select-none" aria-hidden>
    |
  </span>
}

function QueryMetaBar({ query, open }: { query: TraceSqlQuery; open: boolean }) {
  const meta = queryMeta(query)

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
      <ChevronRightIcon
        className={cn(
          "size-3.5 shrink-0 text-muted-foreground transition-transform",
          open && "rotate-90",
        )}
      />
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <DatabaseIcon className="size-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
        <span className="truncate font-medium text-foreground">{meta}</span>
      </span>
      <MetaSep />
      <span
        className={cn(
          "inline-flex items-center gap-1 font-mono text-[12px] font-semibold tabular-nums",
          query.status === "error" ? "text-destructive" : "text-foreground",
        )}
      >
        <ClockIcon className="size-3.5 shrink-0 text-muted-foreground" />
        {formatQueryDuration(query.durationMs)}
      </span>
      {query.startedAt ? (
        <>
          <MetaSep />
          <span className="truncate tabular-nums text-[12px]">
            {formatQueryWhen(query.startedAt)}
          </span>
        </>
      ) : null}
    </div>
  )
}

const SqlQueryRow = memo(function SqlQueryRow({ query }: { query: TraceSqlQuery }) {
  const [open, setOpen] = useState(false)
  const preview = query.statement.replace(/\s+/g, " ").trim()

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="py-1.5">
      <div className="overflow-hidden rounded-md border border-border bg-background">
        <CollapsibleTrigger className="flex w-full cursor-pointer flex-col gap-2 px-3 py-2.5 text-left hover:bg-muted/20">
          <QueryMetaBar query={query} open={open} />
          {!open ? (
            <div className="relative min-w-0 pl-5">
              {/* Plain text in the preview — highlightSql only when expanded. */}
              <p className="truncate pr-8 font-mono text-[12px] leading-relaxed text-foreground">
                {preview}
              </p>
              <div className="absolute top-0 right-0">
                <CopyQueryButton value={query.statement} />
              </div>
            </div>
          ) : null}
        </CollapsibleTrigger>

        {open ? (
          <CollapsibleContent>
            <div className="relative border-t border-border bg-muted/30">
              <button
                type="button"
                className="block w-full cursor-pointer text-left"
                onClick={() => setOpen(false)}
              >
                <pre className="max-h-64 w-full overflow-auto px-3 py-3 pr-10 pb-10 font-mono text-[12px] leading-relaxed wrap-break-word whitespace-pre-wrap text-foreground">
                  {highlightSql(query.statement)}
                </pre>
              </button>
              <div className="absolute right-2 bottom-2 z-10">
                <CopyQueryButton value={query.statement} />
              </div>
            </div>
          </CollapsibleContent>
        ) : null}
      </div>
    </Collapsible>
  )
})

export function SqlQueryList({
  queries,
  spans,
  spanFilter,
  onClearSpanFilter,
  isLoading = false,
}: SqlQueryListProps) {
  const [search, setSearch] = useState("")
  const needle = search.trim().toLowerCase()

  const spanById = useMemo(() => {
    const map = new Map<string, Span>()
    for (const span of spans) map.set(span.id, span)
    return map
  }, [spans])

  const spanName = useMemo(() => {
    if (!spanFilter) return null
    return spanById.get(spanFilter)?.name ?? spanFilter
  }, [spanById, spanFilter])

  const spanWindow = useMemo(() => {
    if (!spanFilter) return null
    const span = spanById.get(spanFilter)
    if (!span) return null
    return {
      start: span.startOffsetMs,
      end: span.startOffsetMs + span.durationMs,
    }
  }, [spanById, spanFilter])

  const spanFiltered = useMemo(() => {
    if (!spanWindow) return queries
    // A query belongs to the span when its time range overlaps the span's.
    return queries.filter((query) => {
      const queryStart = query.startOffsetMs
      const queryEnd = query.startOffsetMs + query.durationMs
      return queryStart < spanWindow.end && queryEnd > spanWindow.start
    })
  }, [queries, spanWindow])

  const filtered = useMemo(() => {
    if (!needle) return spanFiltered
    return spanFiltered.filter((query) => matchesQuery(query, needle))
  }, [spanFiltered, needle])

  const { visibleItems, hasMore, scrollRef, sentinelRef } = useInfiniteScroll(
    filtered,
    QUERY_PAGE_SIZE,
  )

  if (isLoading && queries.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">Loading queries…</p>
    )
  }

  if (queries.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No DB queries in this trace
      </p>
    )
  }

  return (
    <div ref={scrollRef} className="flex h-full min-h-0 flex-col overflow-y-auto pt-3">
      <div className="mb-2 flex flex-col gap-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search queries"
            className="h-8 pl-8 text-sm"
            aria-label="Search queries"
          />
        </div>

        {spanFilter && spanName ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClearSpanFilter}
              className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-[12px] text-foreground hover:bg-muted"
              aria-label="Clear span filter"
            >
              <span className="shrink-0 text-muted-foreground">Span:</span>
              <span className="min-w-0 truncate font-medium">{spanName}</span>
              <XIcon className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
            <span className="text-[11px] text-muted-foreground">
              {spanFiltered.length} of {queries.length}
            </span>
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          {spanFilter && !needle
            ? "No queries for this span"
            : `No queries match “${search.trim()}”`}
        </p>
      ) : (
        <>
          {visibleItems.map((query) => (
            <SqlQueryRow key={query.spanId} query={query} />
          ))}
          {hasMore ? (
            <>
              {Array.from({ length: 2 }, (_, index) => (
                <Skeleton
                  key={`sql-loading-${index}`}
                  className="my-1.5 h-16 w-full rounded-md"
                />
              ))}
              <div ref={sentinelRef} className="h-px w-full" aria-hidden />
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
