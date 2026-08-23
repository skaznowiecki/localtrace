import type { Json } from "@shared/helpers"

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export function asList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

/** Span/log v2 attributes are `{ type, value }` — unwrap so HTTP/op fields extract. */
export function unwrapTypedAttribute(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value
  const rec = value as Record<string, unknown>
  if ("value" in rec && typeof rec.type === "string") return rec.value
  return value
}

export function flattenAttributes(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    out[key] = unwrapTypedAttribute(child)
  }
  return out
}

export function asString(value: unknown): string | undefined {
  const raw = unwrapTypedAttribute(value)
  if (typeof raw === "string" && raw.length > 0) return raw
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw)
  if (typeof raw === "boolean") return raw ? "true" : "false"
  return undefined
}

export function asNumber(value: unknown): number | undefined {
  const raw = unwrapTypedAttribute(value)
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string" && raw !== "") {
    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

export function toJson(value: unknown): Json {
  if (value == null) return null
  if (typeof value === "string" || typeof value === "boolean") return value
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (Array.isArray(value)) return value.map((item) => toJson(item))
  if (typeof value === "object") {
    const out: Record<string, Json> = {}
    for (const [key, child] of Object.entries(value)) {
      out[key] = toJson(child)
    }
    return out
  }
  return String(value)
}

export function mergeJson(
  attrs: Record<string, Json>,
  data: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue
    attrs[key] = toJson(value)
  }
}

function tag(tags: Record<string, unknown>, key: string): string | undefined {
  return asString(tags[key])
}

export function serviceName(event: Record<string, unknown>): string {
  const tags = asRecord(event.tags)
  const app = asRecord(asRecord(event.contexts).app)
  const sdk = asRecord(event.sdk)
  return (
    tag(tags, "service.name") ??
    tag(tags, "service") ??
    asString(event.server_name) ??
    asString(app.name) ??
    asString(sdk.name) ??
    "sentry"
  )
}

export function resourceAttributes(event: Record<string, unknown>): Json {
  const sdk = asRecord(event.sdk)
  const attrs: Record<string, Json> = {
    "service.name": serviceName(event),
  }
  const environment = asString(event.environment)
  if (environment) attrs["deployment.environment"] = environment
  const release = asString(event.release)
  if (release) attrs["service.version"] = release
  const sdkName = asString(sdk.name)
  if (sdkName) attrs["sentry.sdk"] = sdkName
  const platform = asString(event.platform)
  if (platform) attrs["sentry.platform"] = platform
  const serverName = asString(event.server_name)
  if (serverName) attrs["server.address"] = serverName
  return attrs
}

export function scopeFromSdk(event: Record<string, unknown>): {
  name?: string
  version?: string
} {
  const sdk = asRecord(event.sdk)
  return {
    name: asString(sdk.name),
    version: asString(sdk.version),
  }
}
