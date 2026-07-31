import type { Span } from "../types"
import { readAttr } from "./span-attributes"

export type HttpQueryParam = {
  key: string
  value: string
}

export type HttpSpanMeta = {
  method: string | null
  statusCode: string | null
  url: string | null
  userAgent: string | null
  route: string | null
  version: string | null
  host: string | null
  path: string | null
  scheme: string | null
  queryParams: HttpQueryParam[]
}

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

function tryParseUrl(raw: string | null): URL | null {
  if (!raw) return null
  try {
    return new URL(raw)
  } catch {
    // Relative or path-only targets
    try {
      return new URL(raw, "http://localhost")
    } catch {
      return null
    }
  }
}

function pathFromTarget(target: string | null): string | null {
  if (!target) return null
  if (target.startsWith("/")) {
    const q = target.indexOf("?")
    return q === -1 ? target : target.slice(0, q)
  }
  const parsed = tryParseUrl(target)
  return parsed?.pathname || null
}

function parseQueryParams(
  fullUrl: string | null,
  target: string | null,
  queryAttr: string | null,
): HttpQueryParam[] {
  const params: HttpQueryParam[] = []

  if (queryAttr) {
    const search = queryAttr.startsWith("?") ? queryAttr.slice(1) : queryAttr
    for (const [key, value] of new URLSearchParams(search)) {
      params.push({ key, value })
    }
    if (params.length > 0) return params
  }

  const candidates = [fullUrl, target].filter(Boolean) as string[]
  for (const candidate of candidates) {
    const parsed = tryParseUrl(candidate)
    if (parsed && parsed.searchParams.toString()) {
      for (const [key, value] of parsed.searchParams) {
        params.push({ key, value })
      }
      return params
    }
    const q = candidate.indexOf("?")
    if (q !== -1) {
      for (const [key, value] of new URLSearchParams(candidate.slice(q + 1))) {
        params.push({ key, value })
      }
      if (params.length > 0) return params
    }
  }

  return params
}

function methodFromSpanName(name: string): string | null {
  const verb = name.trim().split(/\s+/)[0]?.toUpperCase()
  if (verb && HTTP_METHODS.has(verb)) return verb
  return null
}

function hostWithPort(
  hostname: string | null,
  port: string | null,
): string | null {
  if (!hostname) return null
  if (!port || port === "80" || port === "443") return hostname
  if (hostname.includes(":")) return hostname
  return `${hostname}:${port}`
}

/** True when the span carries HTTP / URL semantic attributes. */
export function isHttpSpan(span: Span): boolean {
  return (
    readAttr(
      span.attributes,
      "http.request.method",
      "http.method",
      "url.full",
      "http.url",
      "http.route",
      "http.target",
      "url.path",
    ) !== null
  )
}

export function extractHttpSpanMeta(span: Span): HttpSpanMeta {
  const attrs = span.attributes

  const method =
    readAttr(attrs, "http.request.method", "http.method") ??
    methodFromSpanName(span.name)

  const statusCode = readAttr(
    attrs,
    "http.response.status_code",
    "http.status_code",
  )

  const urlAttr = readAttr(attrs, "url.full", "http.url")
  const target = readAttr(attrs, "http.target", "url.path")
  const routeAttr = readAttr(attrs, "http.route")
  const schemeAttr = readAttr(attrs, "url.scheme", "http.scheme")
  const hostAttr =
    readAttr(attrs, "http.host", "url.host") ??
    hostWithPort(
      readAttr(attrs, "server.address", "net.host.name"),
      readAttr(attrs, "server.port", "net.host.port"),
    )

  const parsedUrl = tryParseUrl(urlAttr)
  const scheme =
    schemeAttr ??
    (parsedUrl && urlAttr && /^https?:\/\//i.test(urlAttr)
      ? parsedUrl.protocol.replace(":", "")
      : null)

  const host =
    hostAttr ??
    (parsedUrl && urlAttr && /^https?:\/\//i.test(urlAttr)
      ? parsedUrl.host
      : null)

  const path =
    routeAttr ??
    pathFromTarget(target) ??
    (parsedUrl ? parsedUrl.pathname : null) ??
    (method && span.name.startsWith(`${method} `)
      ? span.name.slice(method.length).trim() || null
      : null)

  let url = urlAttr
  if (!url && scheme && host && path) {
    url = `${scheme}://${host}${path.startsWith("/") ? path : `/${path}`}`
  } else if (!url && path) {
    url = path
  }

  const userAgent = readAttr(
    attrs,
    "user_agent.original",
    "http.user_agent",
  )

  const version = readAttr(
    attrs,
    "network.protocol.version",
    "http.flavor",
  )

  const queryAttr = readAttr(attrs, "url.query")
  const queryParams = parseQueryParams(urlAttr ?? url, target, queryAttr)

  return {
    method,
    statusCode,
    url,
    userAgent,
    route: routeAttr ?? path,
    version,
    host,
    path,
    scheme,
    queryParams,
  }
}

/** HTTP status code from the root span, if any. */
export function extractRootHttpStatusCode(spans: Span[]): string | null {
  const root =
    spans.find((span) => !span.parentId) ??
    spans.find((span) => span.startOffsetMs === 0) ??
    spans[0]

  if (!root) return null
  return extractHttpSpanMeta(root).statusCode
}
