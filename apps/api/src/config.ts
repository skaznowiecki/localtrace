export type Config = {
  databasePath: string
  apiPort: number
  logLevel: string
  otlpMaxBodyBytes: number
  otlpMaxInFlight: number
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

export function loadConfig(): Config {
  return {
    databasePath: process.env.LT_DATABASE_PATH ?? "./data/local-tracer.db",
    apiPort: envInt("LT_API_PORT", 4318),
    logLevel: process.env.LT_LOG_LEVEL ?? "info",
    otlpMaxBodyBytes: envInt("LT_OTLP_MAX_BODY_BYTES", 16 * 1024 * 1024),
    otlpMaxInFlight: envInt("LT_OTLP_MAX_IN_FLIGHT", 4),
  }
}
