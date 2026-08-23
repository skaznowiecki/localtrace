import type { Json } from "@shared/helpers"

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "bigint") return value.toString()
  return undefined
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

export function stringMap(value: unknown): Record<string, string> {
  const rec = asRecord(value)
  const out: Record<string, string> = {}
  for (const [key, item] of Object.entries(rec)) {
    const s = asString(item)
    if (s != null) out[key] = s
  }
  return out
}

export function numberMap(value: unknown): Record<string, number> {
  const rec = asRecord(value)
  const out: Record<string, number> = {}
  for (const [key, item] of Object.entries(rec)) {
    const n = asNumber(item)
    if (n != null) out[key] = n
  }
  return out
}

export function toJson(value: unknown): Json {
  if (value == null) return null
  if (typeof value === "string" || typeof value === "boolean") return value
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "bigint") return value.toString()
  if (Array.isArray(value)) return value.map(toJson)
  if (typeof value === "object") {
    const out: { [key: string]: Json } = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = toJson(item)
    }
    return out
  }
  return String(value)
}
