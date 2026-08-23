import { ChevronDownIcon } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatSpanDuration } from "@/lib/utils"

import { extractHttpSpanMeta, isHttpSpan } from "../../lib/http-spans"
import { resolveSpanVendor } from "../../lib/span-vendor"
import type { Span, TraceLog, TraceSqlQuery } from "../../types"
import { SpanVendorIcon } from "../display/brand-icons"
import { HttpMethodBadge } from "../display/HttpMethodBadge"
import { HttpPath } from "../display/HttpPath"
import { HttpStatusCodeBadge } from "../display/HttpStatusCodeBadge"
import { resolveSpanOverview } from "../span-overview"
import { AttributeTree, isAttributeTreeEmpty } from "./AttributeTree"
import { LogList } from "./LogList"
import { SqlQueryList } from "./SqlQueryList"

export type SpanDetailsTab = "overview" | "sql-queries" | "logs"

type TraceSpanDetailsProps = {
  span: Span
  spans: Span[]
  logs: TraceLog[]
  logsLoading?: boolean
  sqlQueries: TraceSqlQuery[]
  sqlLoading?: boolean
  activeTab: SpanDetailsTab
  onTabChange: (tab: SpanDetailsTab) => void
  logSpanFilter: string | null
  onClearLogSpanFilter: () => void
  sqlSpanFilter: string | null
  onClearSqlSpanFilter: () => void
}

function MetaSection({
  title,
  defaultOpen = true,
  empty = false,
  emptyLabel = "No attributes",
  /** When this changes, reopen/close to match `defaultOpen` without remounting the tree. */
  resetKey,
  children,
}: {
  title: string
  defaultOpen?: boolean
  empty?: boolean
  emptyLabel?: string
  resetKey?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (resetKey === undefined) return
    setOpen(defaultOpen)
  }, [resetKey, defaultOpen])

  if (empty) {
    return (
      <div className="flex w-full items-center gap-1.5 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground/40 uppercase">
        <ChevronDownIcon className="size-3.5 -rotate-90 opacity-50" />
        <span>{title}</span>
        <span className="font-normal normal-case tracking-normal">
          {emptyLabel}
        </span>
      </div>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-1.5 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground">
        <ChevronDownIcon
          className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
        />
        {title}
      </CollapsibleTrigger>
      {/* Defer heavy trees (attributes) until the section is opened. */}
      {open ? (
        <CollapsibleContent className="pb-3">{children}</CollapsibleContent>
      ) : null}
    </Collapsible>
  )
}

function SpanDetailsHeader({ span }: { span: Span }) {
  const http = isHttpSpan(span) ? extractHttpSpanMeta(span) : null
  const vendor = resolveSpanVendor(span)
  const title =
    http?.route ??
    (http?.method && span.name.startsWith(`${http.method} `)
      ? span.name.slice(http.method.length).trim()
      : span.name)

  return (
    <div className="shrink-0 border-b px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {vendor ? <SpanVendorIcon vendor={vendor} className="size-5" /> : null}
          {http?.method ? <HttpMethodBadge method={http.method} /> : null}
          <p className="min-w-0 flex-1 truncate text-base font-medium">
            {http?.method ? (
              <HttpPath
                value={title || span.name}
                className="text-base font-sans"
              />
            ) : (
              span.name
            )}
          </p>
          {http?.statusCode ? (
            <HttpStatusCodeBadge
              code={http.statusCode}
              className="text-[12px]"
            />
          ) : null}
        </div>
        <p className="shrink-0 font-mono text-lg font-semibold tabular-nums">
          {formatSpanDuration(span.durationMs)}
        </p>
      </div>
    </div>
  )
}

function isSpanDetailsTab(value: string): value is SpanDetailsTab {
  return value === "overview" || value === "sql-queries" || value === "logs"
}

export function TraceSpanDetails({
  span,
  spans,
  logs,
  logsLoading = false,
  sqlQueries,
  sqlLoading = false,
  activeTab,
  onTabChange,
  logSpanFilter,
  onClearLogSpanFilter,
  sqlSpanFilter,
  onClearSqlSpanFilter,
}: TraceSpanDetailsProps) {
  const overview = resolveSpanOverview(span)
  const collapseAttributes = overview !== null

  return (
    <div className="flex h-full min-h-0 flex-col border-t bg-background">
      <SpanDetailsHeader span={span} />

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (isSpanDetailsTab(value)) onTabChange(value)
        }}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="relative flex shrink-0 items-end gap-3 px-4">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border"
          />
          <TabsList
            variant="line"
            className="h-auto gap-4 rounded-none bg-transparent p-0"
          >
            <TabsTrigger
              value="overview"
              className="relative z-10 cursor-pointer rounded-none border-0 border-b-2 border-transparent! px-0 pt-2 pb-2.5 after:hidden data-active:border-foreground!"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="sql-queries"
              className="relative z-10 cursor-pointer rounded-none border-0 border-b-2 border-transparent! px-0 pt-2 pb-2.5 after:hidden data-active:border-foreground!"
            >
              DB Queries
              {sqlQueries.length > 0 ? (
                <span className="ml-1 text-muted-foreground">
                  ({sqlQueries.length})
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              disabled={logs.length === 0}
              className="relative z-10 rounded-none border-0 border-b-2 border-transparent! px-0 pt-2 pb-2.5 after:hidden data-active:border-foreground! enabled:cursor-pointer"
            >
              Logs
              <span className="ml-1 text-muted-foreground">({logs.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="overview"
          className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-4"
        >
          {overview ? overview.render(span) : null}

          <MetaSection
            title="Span Attributes"
            resetKey={span.id}
            defaultOpen={!collapseAttributes}
            empty={isAttributeTreeEmpty(span.attributes)}
          >
            {/* Key only the tree so expand state resets without remounting the whole panel. */}
            <AttributeTree key={span.id} value={span.attributes} />
          </MetaSection>

          <MetaSection
            title="Span Events"
            defaultOpen={false}
            empty={isAttributeTreeEmpty(span.events)}
          >
            <AttributeTree value={span.events} />
          </MetaSection>

          <MetaSection
            title="Resource"
            defaultOpen={false}
            empty={isAttributeTreeEmpty(span.resourceAttributes)}
          >
            <AttributeTree value={span.resourceAttributes} />
          </MetaSection>

          <MetaSection
            title="Scope"
            defaultOpen={false}
            empty={!span.scopeName && !span.scopeVersion}
            emptyLabel="No scope info"
          >
            <AttributeTree
              value={{
                name: span.scopeName,
                version: span.scopeVersion,
              }}
            />
          </MetaSection>

          <MetaSection
            title="Links"
            defaultOpen={false}
            empty={isAttributeTreeEmpty(span.links)}
          >
            <AttributeTree value={span.links} />
          </MetaSection>
        </TabsContent>

        <TabsContent
          value="sql-queries"
          className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-2 pb-4"
        >
          <SqlQueryList
            queries={sqlQueries}
            spans={spans}
            spanFilter={sqlSpanFilter}
            onClearSpanFilter={onClearSqlSpanFilter}
            isLoading={sqlLoading}
          />
        </TabsContent>

        <TabsContent
          value="logs"
          className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-2 pb-4"
        >
          <LogList
            logs={logs}
            spans={spans}
            spanFilter={logSpanFilter}
            onClearSpanFilter={onClearLogSpanFilter}
            isLoading={logsLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
