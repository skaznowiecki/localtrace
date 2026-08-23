export type LogFilterKey = "service" | "severity" | "message" | "trace"

export type LogFilterKeyDef = {
  key: LogFilterKey
  label: string
  description: string
}

export const LOG_FILTER_KEYS: LogFilterKeyDef[] = [
  { key: "service", label: "service", description: "Service name" },
  { key: "severity", label: "severity", description: "Severity bucket (ERROR, WARN, INFO…)" },
  { key: "message", label: "message", description: "Case-insensitive substring on log message" },
  { key: "trace", label: "trace", description: "Case-insensitive substring on trace id" },
]

export type LogSortField = "date" | "service" | "severity"
export type LogSortOrder = "asc" | "desc"

export const LOG_SORT_FIELDS = [
  "date",
  "service",
  "severity",
] as const satisfies readonly LogSortField[]

export const DEFAULT_LOG_SORT: LogSortField = "date"
export const DEFAULT_LOG_ORDER: LogSortOrder = "desc"

export const LOG_SORT_DEFAULT_ORDER: Record<LogSortField, LogSortOrder> = {
  date: "desc",
  service: "asc",
  severity: "desc",
}

export function isLogSortField(value: unknown): value is LogSortField {
  return (
    typeof value === "string" &&
    (LOG_SORT_FIELDS as readonly string[]).includes(value)
  )
}

export function isLogSortOrder(value: unknown): value is LogSortOrder {
  return value === "asc" || value === "desc"
}

export type LogQueryFilters = {
  service?: string
  severity?: string
  message?: string
  traceId?: string
  /** RFC3339 lower bound on log time (API `since`). Not part of `?q=`. */
  since?: string
  /** List sort column. Not part of `?q=`. */
  sort?: LogSortField
  /** List sort direction. Not part of `?q=`. */
  order?: LogSortOrder
}

const KEY_ALIASES: Record<string, LogFilterKey> = {
  service: "service",
  severity: "severity",
  level: "severity",
  body: "message",
  message: "message",
  trace: "trace",
  trace_id: "trace",
}

function normalizeKey(raw: string): LogFilterKey | null {
  return KEY_ALIASES[raw.trim().toLowerCase()] ?? null
}

function splitTokens(query: string): Array<{ start: number; end: number; raw: string }> {
  const tokens: Array<{ start: number; end: number; raw: string }> = []
  let i = 0

  while (i < query.length) {
    while (i < query.length && /\s/.test(query[i]!)) i += 1
    if (i >= query.length) break

    const start = i
    if (query[i] === '"') {
      i += 1
      while (i < query.length && query[i] !== '"') i += 1
      if (i < query.length) i += 1
    } else {
      while (i < query.length && !/\s/.test(query[i]!)) i += 1
    }

    tokens.push({ start, end: i, raw: query.slice(start, i) })
  }

  return tokens
}

export function splitQueryTokens(query: string): string[] {
  return splitTokens(query)
    .map((token) => token.raw.trim())
    .filter((raw) => raw.length > 0)
}

function stripQuotes(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1)
  }
  return value
}

function parseKeyValue(raw: string): { key: string | null; value: string } {
  const colon = raw.indexOf(":")
  if (colon === -1) {
    return { key: null, value: stripQuotes(raw) }
  }
  return {
    key: raw.slice(0, colon),
    value: stripQuotes(raw.slice(colon + 1)),
  }
}

export function parseQuery(query: string): LogQueryFilters {
  const filters: LogQueryFilters = {}
  const bodyParts: string[] = []

  for (const token of splitTokens(query)) {
    const { key: rawKey, value } = parseKeyValue(token.raw)
    if (!value) continue

    if (!rawKey) {
      bodyParts.push(value)
      continue
    }

    const key = normalizeKey(rawKey)
    if (!key) continue

    switch (key) {
      case "service":
        filters.service = value
        break
      case "severity":
        filters.severity = value.toUpperCase()
        break
      case "message":
        bodyParts.push(value)
        break
      case "trace":
        filters.traceId = value.replace(/-/g, "").toLowerCase()
        break
    }
  }

  if (bodyParts.length > 0) filters.message = bodyParts.join(" ")
  return filters
}

function canonicalKeyLabel(key: LogFilterKey): string {
  return key
}

function formatFilterToken(key: LogFilterKey, value: string): string {
  return `${canonicalKeyLabel(key)}:${value}`
}

function tokenMatchesKey(rawToken: string, target: LogFilterKey): boolean {
  const { key: rawKey } = parseKeyValue(rawToken)
  if (!rawKey) {
    return target === "message"
  }
  return normalizeKey(rawKey) === target
}

export function setFilterInQuery(
  query: string,
  key: LogFilterKey,
  value: string | null,
): string {
  const tokens = splitTokens(query)
  const kept: string[] = []
  let replaced = false

  for (const token of tokens) {
    if (!tokenMatchesKey(token.raw, key)) {
      kept.push(token.raw)
      continue
    }

    if (value == null || value === "") continue

    if (!replaced) {
      kept.push(formatFilterToken(key, value))
      replaced = true
    }
  }

  if (value != null && value !== "" && !replaced) {
    kept.push(formatFilterToken(key, value))
  }

  return kept.join(" ").trim()
}

function currentFilterValue(
  filters: LogQueryFilters,
  key: LogFilterKey,
): string | null {
  switch (key) {
    case "service":
      return filters.service ?? null
    case "severity":
      return filters.severity ?? null
    case "message":
      return filters.message ?? null
    case "trace":
      return filters.traceId ?? null
  }
}

function valuesEqual(key: LogFilterKey, a: string, b: string): boolean {
  if (key === "severity" || key === "trace") {
    return a.toLowerCase() === b.toLowerCase()
  }
  return a === b
}

export function isFilterValueSelected(
  filters: LogQueryFilters,
  key: LogFilterKey,
  value: string,
): boolean {
  const current = currentFilterValue(filters, key)
  if (current == null) return false
  return valuesEqual(key, current, value)
}

export function filtersToSearchParams(
  filters: LogQueryFilters,
  limit = 100,
  offset = 0,
): URLSearchParams {
  const params = new URLSearchParams()
  params.set("limit", String(limit))
  if (offset > 0) params.set("offset", String(offset))
  if (filters.service) params.set("service", filters.service)
  if (filters.severity) params.set("severity", filters.severity)
  if (filters.message) params.set("message", filters.message)
  if (filters.traceId) params.set("trace_id", filters.traceId)
  if (filters.since) params.set("since", filters.since)
  const sort = filters.sort ?? DEFAULT_LOG_SORT
  const order = filters.order ?? DEFAULT_LOG_ORDER
  if (sort !== DEFAULT_LOG_SORT || order !== DEFAULT_LOG_ORDER) {
    params.set("sort", sort)
    params.set("order", order)
  }
  return params
}
