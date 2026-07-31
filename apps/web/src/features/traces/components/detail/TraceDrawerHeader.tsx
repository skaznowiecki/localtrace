import {
  CheckIcon,
  ClockIcon,
  ExpandIcon,
  ExternalLinkIcon,
  LinkIcon,
  MonitorIcon,
  ShrinkIcon,
  XIcon,
} from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { SheetClose, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  cn,
  formatRelativeTime,
  formatSpanDuration,
  formatTraceDate,
} from "@/lib/utils"

import { extractHttpSpanMeta } from "../../lib/http-spans"
import { getServiceColor } from "../../service-colors"
import type { Span, TraceListItem, TraceStatus } from "../../types"
import { HttpMethodBadge } from "../display/HttpMethodBadge"
import { HttpPath } from "../display/HttpPath"
import { HttpStatusCodeBadge } from "../display/HttpStatusCodeBadge"
import { TraceName } from "../trace-name"

type TraceDrawerHeaderProps = {
  trace: TraceListItem
  spans: Span[]
  fullscreen: boolean
  onFullscreenChange: (fullscreen: boolean) => void
}

function extractRootHttpMeta(spans: Span[]) {
  const root =
    spans.find((span) => !span.parentId) ??
    spans.find((span) => span.startOffsetMs === 0) ??
    spans[0]

  if (!root) {
    return { method: null, url: null, statusCode: null }
  }

  const meta = extractHttpSpanMeta(root)
  return {
    method: meta.method,
    url: meta.url,
    statusCode: meta.statusCode,
  }
}

function statusAccentClass(status: TraceStatus): string {
  if (status === "error") return "border-t-destructive"
  if (status === "ok") return "border-t-emerald-500"
  return "border-t-muted-foreground/40"
}

function StatusPill({ status }: { status: TraceStatus }) {
  const label =
    status === "error" ? "Error" : status === "ok" ? "OK" : "Unset"

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-white",
        status === "error" && "bg-destructive",
        status === "ok" && "bg-emerald-500",
        status === "unset" && "bg-muted-foreground",
      )}
    >
      {label}
    </span>
  )
}

/** Prefer HTTP outcome for header chrome; child span errors stay in the waterfall. */
function resolveHeaderStatus(
  traceStatus: TraceStatus,
  httpStatusCode: string | null,
): TraceStatus {
  if (httpStatusCode == null) return traceStatus
  const code = Number(httpStatusCode)
  if (!Number.isFinite(code)) return traceStatus
  return code >= 400 ? "error" : "ok"
}

export function TraceDrawerHeader({
  trace,
  spans,
  fullscreen,
  onFullscreenChange,
}: TraceDrawerHeaderProps) {
  const [copied, setCopied] = useState(false)
  const http = extractRootHttpMeta(spans)
  const serviceColor = getServiceColor(trace.rootService)
  const headerStatus = resolveHeaderStatus(trace.status, http.statusCode)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore clipboard failures
    }
  }

  const openExternal = () => {
    window.open(window.location.href, "_blank", "noopener,noreferrer")
  }

  return (
    <header
      className={cn(
        "shrink-0 border-b border-t-2 bg-muted/20",
        statusAccentClass(headerStatus),
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm"
            style={{ backgroundColor: serviceColor }}
          >
            <MonitorIcon className="size-3 text-white" />
          </span>

          <SheetTitle className="sr-only">{trace.name}</SheetTitle>
          <SheetDescription className="sr-only">
            Trace {trace.id}
          </SheetDescription>

          <nav
            aria-label="Trace path"
            className="flex min-w-0 items-center gap-1.5 text-sm"
          >
            <span className="shrink-0 font-semibold text-foreground">
              {trace.rootService}
            </span>
            <span className="shrink-0 text-muted-foreground/60">›</span>
            <span className="min-w-0 truncate">
              <TraceName name={trace.name} path={trace.httpUrl} />
            </span>
            <span className="shrink-0 text-muted-foreground/60">›</span>
            <span className="shrink-0 font-semibold text-foreground">
              trace_id
            </span>
            <span className="min-w-0 truncate font-mono text-[12px] text-muted-foreground tabular-nums">
              {trace.id}
            </span>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-sky-600 hover:bg-sky-500/10 hover:text-sky-700"
                  onClick={() => void copyLink()}
                  aria-label="Copy link"
                />
              }
            >
              {copied ? (
                <CheckIcon className="size-3.5" />
              ) : (
                <LinkIcon className="size-3.5" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {copied ? "Copied" : "Copy link"}
            </TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-md bg-sky-500/10 px-2.5 text-sky-700 hover:bg-sky-500/15 hover:text-sky-800"
            onClick={() => onFullscreenChange(!fullscreen)}
          >
            {fullscreen ? "Exit Fullscreen" : "Open Fullscreen"}
            {fullscreen ? (
              <ShrinkIcon className="size-3.5" />
            ) : (
              <ExpandIcon className="size-3.5" />
            )}
          </Button>

          <div className="mx-1 h-4 w-px bg-border" />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  onClick={openExternal}
                  aria-label="Open in new tab"
                />
              }
            >
              <ExternalLinkIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Open in new tab</TooltipContent>
          </Tooltip>

          <SheetClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                aria-label="Close"
              />
            }
          >
            <XIcon className="size-3.5" />
          </SheetClose>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t px-4 py-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
          <ClockIcon className="size-3.5 text-muted-foreground" />
          {formatSpanDuration(trace.durationMs)}
        </span>

        <span className="h-3.5 w-px bg-border" />

        {http.url ? (
          <>
            {http.method ? <HttpMethodBadge method={http.method} /> : null}
            <HttpPath value={http.url} className="text-[13px] font-semibold" />
          </>
        ) : (
          <TraceName name={trace.name} path={trace.httpUrl} />
        )}

        {http.statusCode ? (
          <HttpStatusCodeBadge code={http.statusCode} className="text-[11px]" />
        ) : (
          <StatusPill status={headerStatus} />
        )}

        <span className="text-[12px] text-muted-foreground tabular-nums">
          {formatTraceDate(trace.startTime)}{" "}
          <span className="text-muted-foreground/70">
            ({formatRelativeTime(trace.startTime)})
          </span>
        </span>
      </div>
    </header>
  )
}
