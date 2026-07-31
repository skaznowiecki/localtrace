export type TraceFilterKey =
  | "service"
  | "status"
  | "method"
  | "http.status_code"
  | "url"
  | "duration"
  | "name"

export type TraceFilterKeyDef = {
  key: TraceFilterKey
  label: string
  description: string
}

export const TRACE_FILTER_KEYS: TraceFilterKeyDef[] = [
  { key: "service", label: "service", description: "Root service name" },
  { key: "status", label: "status", description: "Trace status (ok / error)" },
  { key: "method", label: "method", description: "HTTP method" },
  {
    key: "http.status_code",
    label: "http.status_code",
    description: "HTTP response status code",
  },
  {
    key: "url",
    label: "url",
    description: "HTTP route pattern (e.g. /users/:id)",
  },
  {
    key: "duration",
    label: "duration",
    description: "Duration with >, <, or >= / <= (e.g. >100ms)",
  },
  { key: "name", label: "name", description: "Root span name contains" },
]

export type TraceQueryFilters = {
  service?: string
  status?: string
  method?: string
  httpStatusCode?: number
  url?: string
  name?: string
  durationMinNs?: number
  durationMaxNs?: number
  /** RFC3339 lower bound on trace start time (API `since`). Not part of `?q=`. */
  since?: string
}

export type DurationToken = {
  op: ">" | ">=" | "<" | "<="
  valueNs: number
}

export type ActiveToken = {
  /** Inclusive start index of the token in the query string. */
  start: number
  /** Exclusive end index of the token in the query string. */
  end: number
  raw: string
  key: string | null
  value: string
  /** Whether the cursor is editing the key (before `:`) or the value. */
  phase: "key" | "value"
}

const KEY_ALIASES: Record<string, TraceFilterKey> = {
  service: "service",
  status: "status",
  method: "method",
  "http.status_code": "http.status_code",
  http_status_code: "http.status_code",
  status_code: "http.status_code",
  url: "url",
  path: "url",
  route: "url",
  duration: "duration",
  name: "name",
}

function normalizeKey(raw: string): TraceFilterKey | null {
  return KEY_ALIASES[raw.trim().toLowerCase()] ?? null
}

function parseDurationValue(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase()
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(ns|us|µs|ms|s|m)?$/)
  if (!match) return null

  const amount = Number(match[1])
  if (!Number.isFinite(amount)) return null

  const unit = match[2] ?? "ms"
  switch (unit) {
    case "ns":
      return Math.round(amount)
    case "us":
    case "µs":
      return Math.round(amount * 1_000)
    case "ms":
      return Math.round(amount * 1_000_000)
    case "s":
      return Math.round(amount * 1_000_000_000)
    case "m":
      return Math.round(amount * 60_000_000_000)
    default:
      return null
  }
}

export function parseDurationToken(raw: string): DurationToken | null {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(>=|<=|>|<)(.+)$/)
  if (!match) return null

  const op = match[1] as DurationToken["op"]
  const valueNs = parseDurationValue(match[2])
  if (valueNs == null) return null
  return { op, valueNs }
}

/** Split query into space-separated tokens, respecting simple quoting. */
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

/** Split a query into its raw space-separated token strings (respects quoting). */
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

export function parseQuery(query: string): TraceQueryFilters {
  const filters: TraceQueryFilters = {}

  for (const token of splitTokens(query)) {
    const { key: rawKey, value } = parseKeyValue(token.raw)
    if (!rawKey || !value) continue

    const key = normalizeKey(rawKey)
    if (!key) continue

    switch (key) {
      case "service":
        filters.service = value
        break
      case "status": {
        const status = value.toLowerCase()
        if (status === "ok" || status === "error") filters.status = status
        break
      }
      case "method":
        filters.method = value.toUpperCase()
        break
      case "http.status_code": {
        const code = Number(value)
        if (Number.isInteger(code)) filters.httpStatusCode = code
        break
      }
      case "name":
        filters.name = value
        break
      case "url":
        filters.url = value
        break
      case "duration": {
        const duration = parseDurationToken(value)
        if (!duration) break
        if (duration.op === ">" || duration.op === ">=") {
          filters.durationMinNs = duration.valueNs
        } else {
          filters.durationMaxNs = duration.valueNs
        }
        break
      }
    }
  }

  return filters
}

export function serializeFilters(filters: TraceQueryFilters): string {
  const parts: string[] = []

  if (filters.service) parts.push(`service:${quoteIfNeeded(filters.service)}`)
  if (filters.status) parts.push(`status:${filters.status}`)
  if (filters.method) parts.push(`method:${filters.method}`)
  if (filters.httpStatusCode != null) {
    parts.push(`http.status_code:${filters.httpStatusCode}`)
  }
  if (filters.url) parts.push(`url:${quoteIfNeeded(filters.url)}`)
  if (filters.name) parts.push(`name:${quoteIfNeeded(filters.name)}`)
  if (filters.durationMinNs != null) {
    parts.push(`duration:>${formatNs(filters.durationMinNs)}`)
  }
  if (filters.durationMaxNs != null) {
    parts.push(`duration:<${formatNs(filters.durationMaxNs)}`)
  }

  return parts.join(" ")
}

/**
 * Canonical key string used when writing tokens into `q`
 * (e.g. `http.status_code`, not aliases).
 */
function canonicalKeyLabel(key: TraceFilterKey): string {
  return key
}

function formatFilterToken(key: TraceFilterKey, value: string): string {
  return `${canonicalKeyLabel(key)}:${quoteIfNeeded(value)}`
}

function tokenMatchesKey(
  rawToken: string,
  target: TraceFilterKey,
): boolean {
  const { key: rawKey } = parseKeyValue(rawToken)
  if (!rawKey) return false
  return normalizeKey(rawKey) === target
}

/**
 * Set or clear a single filter key in the query string while preserving
 * unrelated tokens (order and unknown keys). Does not round-trip through
 * parseQuery/serializeFilters.
 *
 * For `duration`, `value` is the raw comparison (e.g. `>100ms`). Clearing
 * removes all `duration:` tokens; setting replaces them with one token.
 */
export function setFilterInQuery(
  query: string,
  key: TraceFilterKey,
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

    // Drop matching tokens when clearing, or when we'll rewrite below.
    if (value == null || value === "") continue

    if (key === "duration") {
      // Remove all duration tokens; append a single replacement after the loop.
      continue
    }

    if (!replaced) {
      kept.push(formatFilterToken(key, value))
      replaced = true
    }
    // Skip additional tokens for the same key (single-select).
  }

  if (value != null && value !== "") {
    if (key === "duration" || !replaced) {
      kept.push(formatFilterToken(key, value))
    }
  }

  return kept.join(" ").trim()
}

/** Toggle a facet value: same value clears the key; otherwise sets it. */
export function toggleFilterValue(
  query: string,
  key: TraceFilterKey,
  value: string,
): string {
  const filters = parseQuery(query)
  const current = currentFilterValue(filters, key)
  const next =
    current != null && valuesEqual(key, current, value) ? null : value
  return setFilterInQuery(query, key, next)
}

function currentFilterValue(
  filters: TraceQueryFilters,
  key: TraceFilterKey,
): string | null {
  switch (key) {
    case "service":
      return filters.service ?? null
    case "status":
      return filters.status ?? null
    case "method":
      return filters.method ?? null
    case "http.status_code":
      return filters.httpStatusCode != null
        ? String(filters.httpStatusCode)
        : null
    case "url":
      return filters.url ?? null
    case "name":
      return filters.name ?? null
    case "duration": {
      // Represent the active bound(s) as serialized duration token values.
      // Facet presets are single-sided, so prefer min then max.
      if (filters.durationMinNs != null) {
        return `>${formatNs(filters.durationMinNs)}`
      }
      if (filters.durationMaxNs != null) {
        return `<${formatNs(filters.durationMaxNs)}`
      }
      return null
    }
  }
}

function valuesEqual(
  key: TraceFilterKey,
  a: string,
  b: string,
): boolean {
  if (key === "method" || key === "status") {
    return a.toLowerCase() === b.toLowerCase()
  }
  if (key === "duration") {
    const da = parseDurationToken(a)
    const db = parseDurationToken(b)
    if (da && db) {
      return da.op === db.op && da.valueNs === db.valueNs
    }
  }
  return a === b
}

/** Whether `filters` currently selects this facet value for `key`. */
export function isFilterValueSelected(
  filters: TraceQueryFilters,
  key: TraceFilterKey,
  value: string,
): boolean {
  const current = currentFilterValue(filters, key)
  if (current == null) return false
  return valuesEqual(key, current, value)
}

function quoteIfNeeded(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value
}

function formatNs(ns: number): string {
  if (ns % 1_000_000_000 === 0) return `${ns / 1_000_000_000}s`
  if (ns % 1_000_000 === 0) return `${ns / 1_000_000}ms`
  if (ns % 1_000 === 0) return `${ns / 1_000}us`
  return `${ns}ns`
}

/**
 * Detect the token under the cursor for autocomplete (key vs value phase).
 * When the query ends with a trailing space, returns an empty key-phase token
 * at the cursor so the user can start a new filter.
 */
export function getActiveToken(query: string, cursor: number): ActiveToken {
  const clamped = Math.max(0, Math.min(cursor, query.length))
  const tokens = splitTokens(query)

  if (
    tokens.length === 0 ||
    (clamped > 0 && /\s/.test(query[clamped - 1] ?? "") && clamped === query.length)
  ) {
    return {
      start: clamped,
      end: clamped,
      raw: "",
      key: null,
      value: "",
      phase: "key",
    }
  }

  const token =
    tokens.find((t) => clamped >= t.start && clamped <= t.end) ??
    tokens[tokens.length - 1]!

  const colonInToken = token.raw.indexOf(":")
  const cursorInToken = clamped - token.start

  if (colonInToken === -1 || cursorInToken <= colonInToken) {
    return {
      start: token.start,
      end: token.end,
      raw: token.raw,
      key: colonInToken === -1 ? token.raw : token.raw.slice(0, colonInToken),
      value: "",
      phase: "key",
    }
  }

  const { key, value } = parseKeyValue(token.raw)
  return {
    start: token.start,
    end: token.end,
    raw: token.raw,
    key,
    value,
    phase: "value",
  }
}

export function replaceActiveToken(
  query: string,
  active: ActiveToken,
  nextToken: string,
): { query: string; cursor: number } {
  const before = query.slice(0, active.start)
  const after = query.slice(active.end)
  const needsTrailingSpace = !after.startsWith(" ") && !nextToken.endsWith(" ")
  const insertion = needsTrailingSpace ? `${nextToken} ` : nextToken
  const nextQuery = `${before}${insertion}${after}`
  return {
    query: nextQuery,
    cursor: before.length + insertion.length,
  }
}

export function filtersToSearchParams(
  filters: TraceQueryFilters,
  limit = 100,
): URLSearchParams {
  const params = new URLSearchParams()
  params.set("limit", String(limit))
  if (filters.service) params.set("service", filters.service)
  if (filters.status) params.set("status", filters.status)
  if (filters.method) params.set("method", filters.method)
  if (filters.httpStatusCode != null) {
    params.set("http_status_code", String(filters.httpStatusCode))
  }
  if (filters.url) params.set("url", filters.url)
  if (filters.name) params.set("name", filters.name)
  if (filters.durationMinNs != null) {
    params.set("duration_min_ns", String(filters.durationMinNs))
  }
  if (filters.durationMaxNs != null) {
    params.set("duration_max_ns", String(filters.durationMaxNs))
  }
  if (filters.since) params.set("since", filters.since)
  return params
}
