import { useQuery } from "@tanstack/react-query"

import { Copyable } from "@/components/ui/copyable"
import { Skeleton } from "@/components/ui/skeleton"
import {
  claudeMcpJson,
  cursorMcpJson,
  datadogExport,
  otlpGrpcExport,
  otlpHttpExport,
  sentryExport,
  settingsQuery,
} from "@/lib/settings"
import { cn } from "@/lib/utils"

type IngestSetupProps = {
  compact?: boolean
}

export function IngestSetup({ compact = false }: IngestSetupProps) {
  const { data, isLoading, error } = useQuery(settingsQuery())

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load ingest URLs. Is the API running on port 4318?
      </p>
    )
  }

  const { otlp, otlpGrpc, sentryDsn, datadog, mcp } = data.endpoints

  return (
    <div className={cn("flex w-full flex-col gap-3", compact && "gap-2")}>
      <Snippet label="OpenTelemetry · HTTP" value={otlpHttpExport(otlp)} />
      {otlpGrpc ? (
        <Snippet label="OpenTelemetry · gRPC" value={otlpGrpcExport(otlpGrpc)} />
      ) : null}
      <Snippet label="Sentry" value={sentryExport(sentryDsn)} />
      <Snippet label="Datadog" value={datadogExport(datadog)} />
      <Snippet
        label="MCP · Cursor"
        hint=".cursor/mcp.json"
        value={cursorMcpJson(mcp)}
      />
      <Snippet
        label="MCP · Claude Code"
        hint=".mcp.json"
        value={claudeMcpJson(mcp)}
      />
    </div>
  )
}

function Snippet({
  label,
  hint,
  value,
}: {
  label: string
  hint?: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-1 text-left">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {hint ? (
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <Copyable
        value={value}
        className="w-full rounded-xl border bg-muted/40 px-2.5 py-2"
      >
        <pre className="m-0 overflow-x-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground">
          {value}
        </pre>
      </Copyable>
    </div>
  )
}
