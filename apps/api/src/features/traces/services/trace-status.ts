import { readAttr } from "../../../lib/attrs"
import type { SpanRecord, TraceStatus } from "../types/span"

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "TRACE",
  "CONNECT",
] as const

const OTEL_STATUS_ERROR = 2
const OTEL_STATUS_OK = 1

export function resolveTraceStatus(
  root: Pick<SpanRecord, "statusCode"> | undefined,
  httpStatusCode: number | undefined,
): TraceStatus {
  if (root && root.statusCode === OTEL_STATUS_ERROR) return "error"
  if (httpStatusCode != null) return httpStatusCode >= 400 ? "error" : "ok"
  if (root && root.statusCode === OTEL_STATUS_OK) return "ok"
  return "ok"
}

export function extractHttpFields(
  span: Pick<SpanRecord, "attributes" | "name">,
): { method?: string; statusCode?: number } {
  const method = (
    readAttr(span.attributes, ["http.request.method", "http.method"]) ??
    methodFromSpanName(span.name)
  )?.toUpperCase()

  const statusRaw = readAttr(span.attributes, [
    "http.response.status_code",
    "http.status_code",
  ])
  const statusCode = statusRaw != null ? Number.parseInt(statusRaw, 10) : undefined

  return {
    method,
    statusCode: statusCode != null && Number.isFinite(statusCode) ? statusCode : undefined,
  }
}

export function extractHttpUrl(span: Pick<SpanRecord, "attributes">): string | undefined {
  const route = readAttr(span.attributes, ["http.route"])?.trim()
  if (route) return route

  const path = readAttr(span.attributes, ["http.target", "url.path"])
  if (path) {
    const stripped = stripQuery(path.trim())
    if (stripped) return stripped
  }

  const full = readAttr(span.attributes, ["url.full", "http.url"])
  if (!full) return undefined
  const fromUrl = pathFromUrl(full.trim())
  return fromUrl || undefined
}

function stripQuery(value: string): string {
  const idx = value.indexOf("?")
  return idx === -1 ? value : value.slice(0, idx)
}

function pathFromUrl(raw: string): string | undefined {
  const afterScheme = raw.includes("://") ? raw.split("://")[1]! : raw
  const start = afterScheme.indexOf("/")
  if (start === -1) return undefined
  return stripQuery(afterScheme.slice(start))
}

function methodFromSpanName(name: string): string | undefined {
  const first = name.split(/\s+/)[0]
  if (!first) return undefined
  const upper = first.toUpperCase()
  return (HTTP_METHODS as readonly string[]).includes(upper) ? upper : undefined
}
