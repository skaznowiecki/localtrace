export const RETENTION_HOURS = [1, 6, 24, 168] as const

export type RetentionHours = (typeof RETENTION_HOURS)[number]

export type SettingsEndpoints = {
  otlp: string
  otlpGrpc: string
  sentryDsn: string
  datadog: string
  mcp: string
}

export type SettingsDto = {
  retentionHours: RetentionHours
  endpoints: SettingsEndpoints
}
