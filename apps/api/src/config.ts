import { emptyToUndef, parseLevel, type LogLevel } from "@shared/helpers"

export type RetentionHours = 1 | 6 | 24 | 168

export type Config = {
  databasePath: string
  apiPort: number
  grpcPort: number
  logLevel: LogLevel
  otlpMaxBodyBytes: number
  retentionHours: RetentionHours
  webRoot?: string
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

function envRetentionHours(): RetentionHours {
  const n = envInt("LT_RETENTION_HOURS", 24)
  if (n === 1 || n === 6 || n === 24 || n === 168) return n
  return 24
}

export function loadConfig(): Config {
  return {
    databasePath: process.env.LT_DATABASE_PATH ?? "./data/localtrace.db",
    apiPort: envInt("LT_API_PORT", 4318),
    grpcPort: envInt("LT_GRPC_PORT", 4317),
    logLevel: parseLevel(process.env.LT_LOG_LEVEL),
    otlpMaxBodyBytes: envInt("LT_OTLP_MAX_BODY_BYTES", 16 * 1024 * 1024),
    retentionHours: envRetentionHours(),
    webRoot: emptyToUndef(process.env.LT_WEB_ROOT),
  }
}
