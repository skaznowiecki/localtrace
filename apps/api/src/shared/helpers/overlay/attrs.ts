import type { Json } from "../attrs"

export function asAttrMap(value: Json): Record<string, Json> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, Json>) }
  }
  return {}
}

export function asString(value: Json | undefined): string | undefined {
  if (typeof value === "string" && value.length > 0) return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return undefined
}

export function copyIfMissing(
  attrs: Record<string, Json>,
  from: string,
  to: string,
): void {
  if (attrs[to] != null) return
  const value = attrs[from]
  if (value == null) return
  attrs[to] = value
}
