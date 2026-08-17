export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json }

function coerceAttrValue(value: Json): string | undefined {
  if (typeof value === "string" && value.length > 0) return value
  if (typeof value === "number") return String(value)
  return undefined
}

export function readAttrPath(attrs: Json, path: string): string | undefined {
  if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
    const flat = coerceAttrValue(attrs[path] as Json)
    if (flat !== undefined) return flat
  }

  let current: Json = attrs
  for (const segment of path.split(".").filter((s) => s.length > 0)) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined
    }
    current = current[segment] as Json
  }
  return coerceAttrValue(current)
}

export function readAttr(attrs: Json, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readAttrPath(attrs, key)
    if (value !== undefined) return value
  }
  return undefined
}

function insertPath(
  map: Record<string, Json>,
  segments: string[],
  value: Json,
): void {
  if (segments.length === 0) return
  if (segments.length === 1) {
    map[segments[0]!] = value
    return
  }
  const [head, ...rest] = segments
  const existing = map[head!]
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
    map[head!] = {}
  }
  insertPath(map[head!] as Record<string, Json>, rest, value)
}

export function nestDottedKeys(value: Json): Json {
  if (Array.isArray(value)) {
    return value.map((item) => nestDottedKeys(item))
  }
  if (value && typeof value === "object") {
    const nested: Record<string, Json> = {}
    for (const [key, child] of Object.entries(value)) {
      const nestedChild = nestDottedKeys(child as Json)
      const segments = key.split(".").filter((s) => s.length > 0)
      insertPath(nested, segments, nestedChild)
    }
    return nested
  }
  return value
}

export function emptyToUndef(value: string | null | undefined): string | undefined {
  if (value == null || value === "") return undefined
  return value
}

export function toBigInt(value: unknown, fallback = 0n): bigint {
  if (typeof value === "bigint") return value
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value))
  if (typeof value === "string" && value !== "") {
    try {
      return BigInt(value)
    } catch {
      return fallback
    }
  }
  return fallback
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "string" && value !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

export function parseJson(raw: unknown): Json {
  if (raw == null || raw === "") return null
  if (typeof raw === "object") return raw as Json
  if (typeof raw !== "string") return null
  try {
    return JSON.parse(raw) as Json
  } catch {
    return null
  }
}
