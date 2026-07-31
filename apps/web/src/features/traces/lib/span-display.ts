import type { Span } from "../types"
import { extractHttpSpanMeta, isHttpSpan } from "./http-spans"
import { isHttpMethodOnlyName } from "./http-resource-name"

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

/**
 * Compact label for waterfall bars, tooltips, and stats grouping.
 * Bare HTTP verbs become `GET s3.us-east-1.amazonaws.com` (host only).
 */
export function spanDisplayLabel(
  span: Pick<Span, "name" | "attributes" | "service">,
): string {
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
