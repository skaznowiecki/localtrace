import { readAttr, toNumber, type Json } from "@shared/helpers"
import {
  dbSystem as readDbSystem,
  REDIS_SYSTEMS,
  S3_HOST,
  statementHit,
} from "./span-type"
import type { BreakdownItem } from "../types/span"

const APP = "App"
const SPAN_KIND_CLIENT = 3
const SPAN_KIND_SERVER = 2
const SQL_VERB =
  /^\s*(WITH|SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|EXPLAIN|TRUNCATE|MERGE)\b/i
const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "TRACE",
  "CONNECT",
])

export type SpanLite = {
  spanId: string
  parentSpanId?: string
  name: string
  kind: number
  attributes: Json
  startTimeNs: bigint
  durationNs: bigint
}

export function aggregate(spans: SpanLite[]): BreakdownItem[] {
  const byId = new Map<string, SpanLite>()
  const children = new Map<string, SpanLite[]>()
  for (const span of spans) {
    byId.set(span.spanId, span)
    if (!span.parentSpanId) continue
    const list = children.get(span.parentSpanId)
    if (list) list.push(span)
    else children.set(span.parentSpanId, [span])
  }

  const byName = new Map<string, { durationNs: bigint; spanCount: number }>()
  for (const span of spans) {
    const exclusive = exclusiveNs(span, children)
    if (exclusive === 0n) continue

    const name = groupKey(span, byId)
    const acc = byName.get(name)
    if (acc) {
      acc.durationNs += exclusive
      acc.spanCount += 1
    } else {
      byName.set(name, { durationNs: exclusive, spanCount: 1 })
    }
  }

  return [...byName.entries()]
    .map(([name, acc]) => ({
      name,
      durationNs: Number(acc.durationNs),
      spanCount: acc.spanCount,
    }))
    .sort((a, b) => {
      if (a.name === APP && b.name !== APP) return 1
      if (b.name === APP && a.name !== APP) return -1
      return b.durationNs - a.durationNs
    })
}

export function serialize(items: BreakdownItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      name: item.name,
      duration_ns: item.durationNs,
      span_count: item.spanCount,
    })),
  )
}

export function parse(raw: Json): BreakdownItem[] | null {
  if (raw == null) return null
  if (!Array.isArray(raw)) return null

  const items: BreakdownItem[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue
    const name = typeof entry.name === "string" ? entry.name : ""
    if (!name) continue
    items.push({
      name,
      durationNs: toNumber(entry.duration_ns),
      spanCount: toNumber(entry.span_count),
    })
  }
  return items
}

/**
 * Self-time: duration minus the union of all descendant ranges clipped
 * to this span. Direct-child sums double-count when an intermediate
 * parent is ~0ms (Express router) and the grandchild holds the work.
 */
function exclusiveNs(
  span: SpanLite,
  children: Map<string, SpanLite[]>,
): bigint {
  const start = span.startTimeNs
  const end = start + span.durationNs
  if (end <= start) return 0n

  const ranges: { start: bigint; end: bigint }[] = []
  const stack = [...(children.get(span.spanId) ?? [])]
  const seen = new Set<string>()
  while (stack.length > 0) {
    const child = stack.pop()!
    if (seen.has(child.spanId)) continue
    seen.add(child.spanId)
    ranges.push({
      start: child.startTimeNs,
      end: child.startTimeNs + child.durationNs,
    })
    const kids = children.get(child.spanId)
    if (kids) stack.push(...kids)
  }

  const covered = clippedUnionNs(start, end, ranges)
  return span.durationNs > covered ? span.durationNs - covered : 0n
}

function clippedUnionNs(
  start: bigint,
  end: bigint,
  ranges: { start: bigint; end: bigint }[],
): bigint {
  const clipped: { start: bigint; end: bigint }[] = []
  for (const range of ranges) {
    const s = range.start > start ? range.start : start
    const e = range.end < end ? range.end : end
    if (e > s) clipped.push({ start: s, end: e })
  }
  if (clipped.length === 0) return 0n

  clipped.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
  let covered = 0n
  let curStart = clipped[0]!.start
  let curEnd = clipped[0]!.end
  for (let i = 1; i < clipped.length; i++) {
    const range = clipped[i]!
    if (range.start <= curEnd) {
      if (range.end > curEnd) curEnd = range.end
    } else {
      covered += curEnd - curStart
      curStart = range.start
      curEnd = range.end
    }
  }
  return covered + (curEnd - curStart)
}

/**
 * Exclusive time rolls up to the nearest Prisma client op, else to
 * Redis / outbound HTTP / SQL, else App (handler + middleware).
 */
function groupKey(span: SpanLite, byId: Map<string, SpanLite>): string {
  let current: SpanLite | undefined = span
  let fallback: string | null = null
  const seen = new Set<string>()
  while (current && !seen.has(current.spanId)) {
    seen.add(current.spanId)
    const prisma = prismaOpKey(current)
    if (prisma) return prisma
    if (fallback == null) fallback = otherWorkKey(current)
    current = current.parentSpanId ? byId.get(current.parentSpanId) : undefined
  }
  return fallback ?? APP
}

function prismaOpKey(span: SpanLite): string | null {
  if (span.name !== "prisma:client:operation") return null
  const labeled = readAttr(span.attributes, ["name"])
  if (labeled) return labeled
  const model = readAttr(span.attributes, ["model"])
  const method = readAttr(span.attributes, ["method"])
  if (model && method) return `${model}.${method}`
  return "prisma"
}

function otherWorkKey(span: SpanLite): string | null {
  const system = dbSystem(span)
  if (system && REDIS_SYSTEMS.has(system)) {
    return "redis"
  }
  const http = httpClientKey(span)
  if (http) return http
  if (isDb(span)) return dbKey(span, system)
  return null
}

function httpClientKey(span: SpanLite): string | null {
  if (isDb(span) || span.name.startsWith("prisma:")) return null
  if (span.kind === SPAN_KIND_SERVER) return null

  const otelKind = readAttr(span.attributes, ["otel.kind"])?.toUpperCase()
  const isClient =
    span.kind === SPAN_KIND_CLIENT || otelKind === "CLIENT"
  if (!isClient) return null

  const host = httpHost(span)
  if (host && S3_HOST.test(host.split(":")[0] ?? host)) return "s3"

  const method = httpMethod(span)
  if (method && host) return `${method} ${host}`
  if (host) return host
  if (method) return method
  return span.name || "http"
}

function dbKey(span: SpanLite, system: string | undefined): string {
  const sql = compactSql(span.name) ?? compactSql(dbStatement(span) ?? "")
  if (sql) return sql
  if (system === "postgresql" || system === "postgres") return "postgres"
  if (system === "mongodb" || system === "mongo") return "mongo"
  if (system) return system
  return "db"
}

function isDb(span: SpanLite): boolean {
  if (dbSystem(span)) return true
  if (dbStatement(span)) return true
  return SQL_VERB.test(span.name)
}

function dbSystem(span: SpanLite): string | undefined {
  return readDbSystem(span.attributes)
}

function dbStatement(span: SpanLite): string | undefined {
  return statementHit(span.attributes)?.value
}

function compactSql(sql: string): string | null {
  const verbMatch = SQL_VERB.exec(sql)
  if (!verbMatch) return null
  const verb = verbMatch[1]!.toUpperCase()
  const quoted = /"public"\."([^"]+)"/.exec(sql)
  if (quoted?.[1]) return `${verb} ${quoted[1]}`
  const from = /\bFROM\s+(?:public\.)?["`]?(\w+)/i.exec(sql)
  if (from?.[1]) return `${verb} ${from[1]}`
  const into = /\b(?:INTO|UPDATE)\s+(?:public\.)?["`]?(\w+)/i.exec(sql)
  if (into?.[1]) return `${verb} ${into[1]}`
  return verb
}

function httpMethod(span: SpanLite): string | null {
  const fromAttr = readAttr(span.attributes, [
    "http.request.method",
    "http.method",
  ])
  if (fromAttr) return fromAttr.toUpperCase()
  const verb = span.name.trim().split(/\s+/)[0]?.toUpperCase()
  if (verb && HTTP_METHODS.has(verb)) return verb
  return null
}

function httpHost(span: SpanLite): string | null {
  const host = readAttr(span.attributes, [
    "server.address",
    "http.host",
    "url.host",
    "net.peer.name",
    "net.host.name",
  ])
  if (host) return host
  const url = readAttr(span.attributes, ["url.full", "http.url"])
  if (!url) return null
  try {
    return new URL(url).host || null
  } catch {
    return null
  }
}
