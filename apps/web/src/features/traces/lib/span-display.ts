import type { Span } from "../types"
import { extractHttpSpanMeta, isHttpSpan } from "./http-spans"
import { isHttpMethodOnlyName } from "./http-resource-name"
import { readAttr } from "./span-attributes"

const SQL_VERB =
  /^\s*(WITH|SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|EXPLAIN|TRUNCATE|MERGE)\b/i

const METHOD_PREFIX =
  /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE)(?:\s+(\S.*))?$/i

function hostFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.host || null
  } catch {
    return null
  }
}

/** Prefer semantic host; fall back to host parsed from URL. */
export function httpHostForSpan(span: Pick<Span, "attributes" | "name">): string | null {
  const meta = extractHttpSpanMeta(span as Span)
  if (meta.host) return meta.host
  if (meta.url) return hostFromUrl(meta.url)
  return null
}

export function parseHttpSpanLabel(name: string): {
  method: string
  target: string | null
} | null {
  const match = METHOD_PREFIX.exec(name.trim())
  if (!match) return null
  const target = match[2]?.trim()
  return {
    method: match[1]!.toUpperCase(),
    target: target && target.length > 0 ? target : null,
  }
}

/** Prisma client ops store `User.findFirst` on attributes.name. */
export function prismaOperationLabel(
  span: Pick<Span, "name" | "attributes">,
): string | null {
  if (span.name !== "prisma:client:operation") return null
  return readAttr(span.attributes, "name")
}

/** Turn a raw SQL span name into `SELECT User` (full statement stays in title). */
export function compactSqlLabel(sql: string): string | null {
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

/**
 * Compact label for waterfall bars, tooltips, and stats grouping.
 * Bare HTTP verbs become `GET s3.us-east-1.amazonaws.com` (host only).
 */
export function spanDisplayLabel(
  span: Pick<Span, "name" | "attributes" | "service">,
): string {
  const prisma = prismaOperationLabel(span)
  if (prisma) return prisma

  const sql = compactSqlLabel(span.name)
  if (sql) return sql

  const methodOnly = isHttpMethodOnlyName(span.name)
  if (!methodOnly && !isHttpSpan(span as Span)) {
    return span.name
  }

  const meta = extractHttpSpanMeta(span as Span)
  const method = meta.method?.toUpperCase()
  if (!method) return span.name

  // Already "GET /path" or similar — keep as-is for non-method-only names.
  if (!methodOnly && /\s+\S/.test(span.name)) {
    return span.name
  }

  const host = httpHostForSpan(span)
  if (host) return `${method} ${host}`

  return span.name
}
