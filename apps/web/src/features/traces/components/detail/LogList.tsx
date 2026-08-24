import {
  ChevronRightIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { memo, useMemo, useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { useInfiniteScroll } from "../../hooks/useInfiniteScroll"
import type { JsonValue, Span, TraceLog } from "../../types"
import { TraceAttributeTree, isAttributeTreeEmpty } from "./TraceAttributeTree"

type LogListProps = {
  logs: TraceLog[]
  spans: Span[]
  spanFilter: string | null
  onClearSpanFilter: () => void
  isLoading?: boolean
}

const LOG_PAGE_SIZE = 40

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

function formatLogWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  const month = MONTHS[date.getMonth()]
  const day = date.getDate()
  let hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")
  const ms = String(date.getMilliseconds()).padStart(3, "0")
  const ampm = hours >= 12 ? "pm" : "am"
  hours = hours % 12 || 12

  return `${month} ${day} ${hours}:${minutes}:${seconds}.${ms} ${ampm}`
}

function bodyToText(body: JsonValue): string {
  if (body === null || body === undefined) return ""
  if (typeof body === "string") return body
  if (typeof body === "number" || typeof body === "boolean") return String(body)
  try {
    return JSON.stringify(body)
  } catch {
    return String(body)
  }
}

function severityLabel(log: TraceLog): string {
  if (log.severityText?.trim()) return log.severityText.trim()
  if (log.severityNumber == null) return "UNSPECIFIED"
  if (log.severityNumber >= 21) return "FATAL"
  if (log.severityNumber >= 17) return "ERROR"
  if (log.severityNumber >= 13) return "WARN"
  if (log.severityNumber >= 9) return "INFO"
  if (log.severityNumber >= 5) return "DEBUG"
  if (log.severityNumber >= 1) return "TRACE"
  return "UNSPECIFIED"
}

function severityTone(label: string): string {
  const key = label.toUpperCase()
  if (key.includes("FATAL") || key.includes("CRITICAL")) {
    return "bg-red-600/15 text-red-700 dark:text-red-400"
  }
  if (key.includes("ERROR")) {
    return "bg-destructive/10 text-destructive dark:bg-destructive/20"
  }
  if (key.includes("WARN")) {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400"
  }
  if (key.includes("INFO")) {
    return "bg-sky-500/15 text-sky-700 dark:text-sky-400"
  }
  if (key.includes("DEBUG")) {
    return "bg-violet-500/15 text-violet-700 dark:text-violet-400"
  }
  if (key.includes("TRACE")) {
    return "bg-muted text-muted-foreground"
  }
  return "bg-muted text-muted-foreground"
}

function LogSeverityBadge({ log }: { log: TraceLog }) {
  const label = severityLabel(log)
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        severityTone(label),
      )}
    >
      {label}
    </span>
  )
}

function matchesLog(log: TraceLog, needle: string): boolean {
  if (!needle) return true
  const haystack = [
    bodyToText(log.body),
    log.severityText,
    log.service,
    log.spanId,
    log.scopeName,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase()
  return haystack.includes(needle)
}

const LogRow = memo(function LogRow({ log }: { log: TraceLog }) {
  const [open, setOpen] = useState(false)
  const bodyText = bodyToText(log.body)
  const hasAttributes = !isAttributeTreeEmpty(log.attributes)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="py-1.5">
      <div className="overflow-hidden rounded-md border border-border bg-background">
        <CollapsibleTrigger className="flex w-full cursor-pointer flex-col gap-1.5 px-3 py-2.5 text-left hover:bg-muted/20">
          <div className="flex min-w-0 items-center gap-2">
            <ChevronRightIcon
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-90",
              )}
            />
            <LogSeverityBadge log={log} />
            <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
              {bodyText || (
                <span className="text-muted-foreground italic">Empty body</span>
              )}
            </span>
            <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
              {formatLogWhen(log.time)}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2 pl-5 text-[11px] text-muted-foreground">
            <span className="truncate font-medium text-foreground/80">
              {log.service}
            </span>
            {log.spanId ? (
              <>
                <span className="text-border select-none" aria-hidden>
                  |
                </span>
                <span className="truncate font-mono">{log.spanId.slice(0, 8)}</span>
              </>
            ) : null}
          </div>
        </CollapsibleTrigger>

        {open ? (
          <CollapsibleContent>
            <div className="space-y-3 border-t border-border bg-muted/30 px-3 py-3">
              {bodyText ? (
                <pre className="max-h-48 overflow-auto font-mono text-[12px] leading-relaxed wrap-break-word whitespace-pre-wrap text-foreground">
                  {bodyText}
                </pre>
              ) : null}
              {hasAttributes ? (
                <div>
                  <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Attributes
                  </p>
                  <TraceAttributeTree value={log.attributes} />
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground">No attributes</p>
              )}
            </div>
          </CollapsibleContent>
        ) : null}
      </div>
    </Collapsible>
  )
})

export function LogList({
  logs,
  spans,
  spanFilter,
  onClearSpanFilter,
  isLoading = false,
}: LogListProps) {
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

  const spanFiltered = useMemo(() => {
    if (!spanFilter) return logs
    return logs.filter((log) => log.spanId === spanFilter)
  }, [logs, spanFilter])

  const filtered = useMemo(() => {
    if (!needle) return spanFiltered
    return spanFiltered.filter((log) => matchesLog(log, needle))
  }, [spanFiltered, needle])

  const { visibleItems, hasMore, scrollRef, sentinelRef } = useInfiniteScroll(
    filtered,
    LOG_PAGE_SIZE,
  )

  if (isLoading && logs.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">Loading logs…</p>
    )
  }

  if (logs.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">No logs in this trace</p>
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
            placeholder="Search logs"
            className="h-8 pl-8 text-sm"
            aria-label="Search logs"
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
              {spanFiltered.length} of {logs.length}
            </span>
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          {spanFilter && !needle
            ? "No logs for this span"
            : `No logs match “${search.trim()}”`}
        </p>
      ) : (
        <>
          {visibleItems.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
          {hasMore ? (
            <>
              {Array.from({ length: 2 }, (_, index) => (
                <Skeleton
                  key={`log-loading-${index}`}
                  className="my-1.5 h-14 w-full rounded-md"
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
