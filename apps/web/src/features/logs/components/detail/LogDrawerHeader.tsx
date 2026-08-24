import {
  CheckIcon,
  ExpandIcon,
  ExternalLinkIcon,
  LinkIcon,
  ShrinkIcon,
  XIcon,
} from "lucide-react"
import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { DebugWithAgent } from "@/components/DebugWithAgent"
import { Button } from "@/components/ui/button"
import { SheetClose, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ServiceBadge } from "@/components/ServiceBadge"
import { cn, formatRelativeTime, formatTraceDate } from "@/lib/utils"

import type { LogListItem } from "../../types"
import { bodyToText, severityLabel } from "../../lib/severity"
import { SeverityBadge } from "../display/SeverityBadge"

type LogDrawerHeaderProps = {
  log: LogListItem
  fullscreen: boolean
  onFullscreenChange: (fullscreen: boolean) => void
}

function severityAccentClass(log: LogListItem): string {
  const text = (log.severityText ?? "").toUpperCase()
  const n = log.severityNumber ?? 0
  if (text.includes("FATAL") || text.includes("CRITICAL") || n >= 21) {
    return "border-t-red-600"
  }
  if (text.includes("ERROR") || n >= 17) return "border-t-destructive"
  if (text.includes("WARN") || n >= 13) return "border-t-amber-500"
  if (text.includes("INFO") || n >= 9) return "border-t-sky-500"
  return "border-t-muted-foreground/40"
}

export function LogDrawerHeader({
  log,
  fullscreen,
  onFullscreenChange,
}: LogDrawerHeaderProps) {
  const [copied, setCopied] = useState(false)

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
        severityAccentClass(log),
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SeverityBadge log={log} />
          <SheetTitle className="sr-only">Log {log.id}</SheetTitle>
          <SheetDescription className="sr-only">
            {log.service} at {log.time}
          </SheetDescription>
          <ServiceBadge service={log.service} />
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <DebugWithAgent
            target="log"
            time={log.time}
            service={log.service}
            severity={severityLabel(log)}
            message={bodyToText(log.body)}
            logId={log.id}
            traceId={log.traceId}
            spanId={log.spanId}
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-pointer text-sky-600 hover:bg-sky-500/10 hover:text-sky-700"
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
            className="h-7 cursor-pointer gap-1.5 rounded-md bg-sky-500/10 px-2.5 text-sky-700 hover:bg-sky-500/15 hover:text-sky-800"
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
                  className="cursor-pointer text-muted-foreground"
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
                className="cursor-pointer text-muted-foreground"
                aria-label="Close"
              />
            }
          >
            <XIcon className="size-3.5" />
          </SheetClose>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t px-4 py-2 text-sm">
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {formatTraceDate(log.time)}{" "}
          <span className="text-muted-foreground/70">
            ({formatRelativeTime(log.time)})
          </span>
        </span>
        {log.traceId ? (
          <>
            <span className="h-3.5 w-px bg-border" />
            <Link
              to="/traces"
              search={{ trace: log.traceId }}
              className="cursor-pointer font-mono text-[12px] text-sky-700 hover:underline dark:text-sky-300"
            >
              {log.traceId}
            </Link>
          </>
        ) : null}
      </div>
    </header>
  )
}
