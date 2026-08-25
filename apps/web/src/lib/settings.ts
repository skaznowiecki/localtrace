import { queryOptions } from "@tanstack/react-query"

import { parseJson } from "@/lib/api"

export type RetentionHours = 1 | 6 | 24 | 168

export type SettingsEndpoints = {
  otlp: string
  otlpGrpc: string
  sentryDsn: string
  datadog: string
  mcp: string
}

export type Settings = {
  retentionHours: RetentionHours
  endpoints: SettingsEndpoints
}

export const RETENTION_PRESETS: { hours: RetentionHours; label: string }[] = [
  { hours: 1, label: "1 hour" },
  { hours: 6, label: "6 hours" },
  { hours: 24, label: "1 day" },
  { hours: 168, label: "7 days" },
]

export const settingsKeys = {
  all: ["settings"] as const,
}

export async function fetchSettings(): Promise<Settings> {
  return parseJson<Settings>(await fetch("/api/settings"))
}

export async function updateSettings(
  retentionHours: RetentionHours,
): Promise<Settings> {
  return parseJson<Settings>(
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ retentionHours }),
    }),
  )
}

export async function clearTelemetry(): Promise<{ ok: true }> {
  return parseJson<{ ok: true }>(
    await fetch("/api/settings/clear", { method: "POST" }),
  )
}

export function settingsQuery() {
  return queryOptions({
    queryKey: settingsKeys.all,
    queryFn: fetchSettings,
    staleTime: 30_000,
  })
}

export function otlpHttpExport(otlp: string): string {
  return [
    `export OTEL_EXPORTER_OTLP_ENDPOINT=${otlp}`,
    "export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf",
  ].join("\n")
}

export function otlpGrpcExport(otlpGrpc: string): string {
  return `export OTEL_EXPORTER_OTLP_ENDPOINT=${otlpGrpc}`
}

export function sentryExport(dsn: string): string {
  return `SENTRY_DSN=${dsn}`
}

export function datadogExport(url: string): string {
  return `DD_TRACE_AGENT_URL=${url}`
}

export function cursorMcpJson(mcp: string): string {
  return JSON.stringify(
    { mcpServers: { "local-tracer": { url: mcp } } },
    null,
    2,
  )
}

export function claudeMcpJson(mcp: string): string {
  return JSON.stringify(
    { mcpServers: { "local-tracer": { type: "http", url: mcp } } },
    null,
    2,
  )
}
