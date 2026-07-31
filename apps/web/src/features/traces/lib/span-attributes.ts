import type { JsonValue } from "../types"

function coerceAttrValue(value: JsonValue): string | null {
  if (typeof value === "string" && value.length > 0) return value
  if (typeof value === "number") return String(value)
  return null
}

/** Resolve a dotted path on nested attrs, with a flat-key fallback. */
export function readAttrPath(attrs: JsonValue, path: string): string | null {
  if (!attrs || typeof attrs !== "object" || Array.isArray(attrs)) return null

  const flat = coerceAttrValue(attrs[path])
  if (flat !== null) return flat

  let current: JsonValue = attrs
  for (const segment of path.split(".").filter(Boolean)) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null
    }
    current = current[segment]
  }

  return coerceAttrValue(current)
}

export function readAttr(attrs: JsonValue, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = readAttrPath(attrs, key)
    if (value !== null) return value
  }
  return null
}
