/** Collapse dynamic path segments into `:id` so concrete paths group by endpoint. */
export function normalizeRoutePath(path: string): string {
  const trimmed = path.trim()
  if (trimmed.length === 0) return ""

  return trimmed
    .split("/")
    .map((segment) => (segment.length > 0 && isDynamicSegment(segment) ? ":id" : segment))
    .join("/")
}

function isDynamicSegment(segment: string): boolean {
  if (segment.startsWith(":") || (segment.startsWith("{") && segment.endsWith("}"))) {
    return true
  }
  if ([...segment].every((c) => c >= "0" && c <= "9")) return true
  if (isUuid(segment)) return true

  const len = segment.length
  return (
    len >= 12 &&
    [...segment].every((c) => /[0-9a-fA-F]/.test(c)) &&
    [...segment].some((c) => c >= "0" && c <= "9")
  )
}

function isUuid(segment: string): boolean {
  if (segment.length !== 36) return false
  return [...segment].every((c, i) => {
    if (i === 8 || i === 13 || i === 18 || i === 23) return c === "-"
    return /[0-9a-fA-F]/.test(c)
  })
}
