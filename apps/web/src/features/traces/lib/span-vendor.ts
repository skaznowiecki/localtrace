import type { Span } from "../types"
import { readAttr } from "./span-attributes"
import { httpHostForSpan } from "./span-display"

export type SpanVendor = "s3" | "postgres" | "prisma"

/** S3 regional / virtual-hosted style hosts. */
const S3_HOST =
  /(?:^|\.)s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i

function isPrismaScope(scopeName: string | null): boolean {
  if (!scopeName) return false
  const lower = scopeName.trim().toLowerCase()
  return lower === "prisma" || lower.startsWith("prisma")
}

function isPostgresSystem(attrs: Span["attributes"]): boolean {
  const system = readAttr(attrs, "db.system")?.trim().toLowerCase()
  return system === "postgresql" || system === "postgres"
}

function isS3Host(span: Pick<Span, "attributes" | "name">): boolean {
  const host = httpHostForSpan(span)
  if (!host) return false
  // Strip port if present (e.g. localhost-style or custom endpoints).
  const hostname = host.split(":")[0] ?? host
  return S3_HOST.test(hostname)
}

/**
 * Resolve a known vendor for span Overview branding.
 * First match wins — more specific (Prisma) before generic (Postgres / S3).
 */
export function resolveSpanVendor(span: Span): SpanVendor | null {
  if (isPrismaScope(span.scopeName)) return "prisma"
  if (isPostgresSystem(span.attributes)) return "postgres"
  if (isS3Host(span)) return "s3"
  return null
}
