import type { Span } from "../types"
import { readAttr } from "./span-attributes"
import { httpHostForSpan } from "./span-display"
import {
  isBrandId,
  resolveBrandFromName,
  type SpanVendor,
} from "@/lib/brand-catalog"

export type { SpanVendor }
export { resolveBrandFromName }

const S3_HOST =
  /(?:^|\.)s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i

const AWS_HOST_BRAND: [RegExp, SpanVendor][] = [
  [S3_HOST, "s3"],
  [/(?:^|\.)dynamodb(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i, "dynamodb"],
  [/(?:^|\.)lambda(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i, "lambda"],
  [/(?:^|\.)sqs(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i, "sqs"],
  [/(?:^|\.)sns(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i, "aws"],
  [/(?:^|\.)rds(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i, "rds"],
  [/(?:^|\.)redshift(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i, "redshift"],
  [/(?:^|\.)execute-api(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i, "apigateway"],
  [/(?:^|\.)elasticache(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i, "elasticache"],
  [/(?:^|\.)docdb(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i, "documentdb"],
]

const TYPE_BRAND: Record<string, SpanVendor> = {
  redis: "redis",
  clickhouse: "clickhouse",
  postgres: "postgres",
  mysql: "mysql",
  sqlite: "sqlite",
  mongo: "mongo",
  s3: "s3",
  dynamodb: "dynamodb",
  prisma: "prisma",
  express: "express",
  openrouter: "openrouter",
  trpc: "trpc",
}

function isPrismaScope(scopeName: string | null): boolean {
  if (!scopeName) return false
  const lower = scopeName.trim().toLowerCase()
  return lower === "prisma" || lower.startsWith("prisma")
}

function isNextJsSpan(span: Pick<Span, "scopeName" | "attributes">): boolean {
  const scope = span.scopeName?.trim().toLowerCase()
  if (scope === "next.js" || scope === "nextjs") return true
  const category = readAttr(span.attributes, "next.span_category")
  return category?.trim().toLowerCase() === "nextjs"
}

/**
 * Resolve a known vendor for span branding.
 * First match wins — framework/ORM before generic db.system.
 */
export function resolveSpanVendor(
  span: Pick<Span, "scopeName" | "attributes" | "name" | "service" | "type">,
): SpanVendor | null {
  if (isPrismaScope(span.scopeName)) return "prisma"
  if (isNextJsSpan(span)) return "nextjs"

  if (span.type && span.type in TYPE_BRAND) {
    return TYPE_BRAND[span.type]!
  }

  const system = readAttr(span.attributes, "db.system.name", "db.system")
  if (system) {
    const fromSystem = resolveBrandFromName(system)
    if (fromSystem) return fromSystem
  }

  const messaging = readAttr(span.attributes, "messaging.system")
  if (messaging) {
    const fromMessaging = resolveBrandFromName(messaging)
    if (fromMessaging) return fromMessaging
  }

  const rpc = readAttr(span.attributes, "rpc.system.name", "rpc.system")
  if (rpc) {
    const fromRpc = resolveBrandFromName(rpc)
    if (fromRpc) return fromRpc
  }

  const genAi = readAttr(
    span.attributes,
    "gen_ai.provider.name",
    "gen_ai.system",
  )
  if (genAi) {
    const fromGenAi = resolveBrandFromName(genAi)
    if (fromGenAi) return fromGenAi
  }

  const component = readAttr(span.attributes, "component")
  if (component) {
    const fromComponent = resolveBrandFromName(component)
    if (fromComponent) return fromComponent
  }

  const operation = readAttr(span.attributes, "datadog.operation")
  if (operation) {
    const prefix = operation.split(".")[0]
    if (prefix) {
      const fromOp = resolveBrandFromName(prefix)
      if (fromOp) return fromOp
    }
  }

  if (span.scopeName) {
    const fromScope = resolveBrandFromName(span.scopeName)
    if (fromScope) return fromScope
  }

  const host = httpHostForSpan(span)
  if (host) {
    const hostname = host.split(":")[0] ?? host
    for (const [pattern, brand] of AWS_HOST_BRAND) {
      if (pattern.test(hostname)) return brand
    }
    const fromHost = resolveBrandFromName(hostname)
    if (fromHost) return fromHost
  }

  return resolveBrandFromName(span.service)
}

export function isSpanVendor(value: string): value is SpanVendor {
  return isBrandId(value)
}
