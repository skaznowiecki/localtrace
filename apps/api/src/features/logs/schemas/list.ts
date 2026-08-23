import * as z from "zod"
import { SEVERITY_BUCKETS } from "../helpers/severity"
import type { LogListFilters, LogSortField, LogSortOrder } from "../types/log"

export const sortField = z.enum(["date", "service", "severity"])
export const sortOrder = z.enum(["asc", "desc"])
export const severityBucket = z.enum(SEVERITY_BUCKETS)

const DEFAULT_SORT: LogSortField = "date"
const DEFAULT_ORDER: LogSortOrder = "desc"

const qstr = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value): string | undefined => {
    const raw = Array.isArray(value) ? value[0] : value
    return raw ? raw : undefined
  })

function parseIntParam(
  raw: string | undefined,
  ctx: z.RefinementCtx,
  label: string,
): number | undefined {
  if (!raw) return undefined
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value)) {
    ctx.addIssue({ code: "custom", path: [label], message: `invalid ${label}` })
    return z.NEVER
  }
  return value
}

function parseSinceNs(
  since: string | undefined,
  ctx: z.RefinementCtx,
): bigint | undefined {
  if (!since) return undefined
  const ms = Date.parse(since)
  if (Number.isNaN(ms)) {
    ctx.addIssue({
      code: "custom",
      path: ["since"],
      message: `invalid since (expected RFC3339): ${since}`,
    })
    return z.NEVER
  }
  if (ms < 0) {
    ctx.addIssue({
      code: "custom",
      path: ["since"],
      message: "invalid since: timestamp must be non-negative",
    })
    return z.NEVER
  }
  return BigInt(ms) * 1_000_000n
}

function parseEnumParam<T extends z.ZodType>(
  raw: string | undefined,
  schema: T,
  ctx: z.RefinementCtx,
  label: string,
): z.infer<T> | undefined {
  if (!raw) return undefined
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    ctx.addIssue({ code: "custom", path: [label], message: `invalid ${label}` })
    return z.NEVER
  }
  return parsed.data
}

function parseTraceIdFilter(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const normalized = raw.replace(/-/g, "").trim().toLowerCase()
  return normalized.length > 0 ? normalized : undefined
}

function parseSeverity(
  raw: string | undefined,
  ctx: z.RefinementCtx,
): string | undefined {
  if (!raw) return undefined
  return parseEnumParam(raw.toUpperCase(), severityBucket, ctx, "severity")
}

export const input = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Max logs to return (default 50)"),
  service: z.string().optional().describe("Filter by service name"),
  severity: severityBucket.optional().describe("OTLP severity bucket"),
  message: z
    .string()
    .optional()
    .describe("Case-insensitive substring (ILIKE) on log message"),
  trace_id: z
    .string()
    .optional()
    .describe("Case-insensitive substring (ILIKE) on trace id; prefix is enough"),
  since: z
    .iso
    .datetime({ offset: true })
    .optional()
    .describe("RFC3339 timestamp; only logs after this"),
  sort: sortField.optional().describe("Sort column (default date)"),
  order: sortOrder.optional().describe("Sort direction (default desc)"),
})

export function filters(args: z.infer<typeof input>): LogListFilters {
  return {
    limit: args.limit ?? 50,
    sort: args.sort ?? DEFAULT_SORT,
    order: args.order ?? DEFAULT_ORDER,
    service: args.service,
    severity: args.severity,
    message: args.message,
    traceId: args.trace_id ? parseTraceIdFilter(args.trace_id) : undefined,
    sinceNs:
      args.since != null ? BigInt(Date.parse(args.since)) * 1_000_000n : undefined,
  }
}

export const query = z
  .object({
    limit: qstr,
    service: qstr,
    severity: qstr,
    message: qstr,
    body: qstr,
    trace_id: qstr,
    since: qstr,
    sort: qstr,
    order: qstr,
  })
  .transform((value, ctx): LogListFilters => {
    const limit = parseIntParam(value.limit, ctx, "limit")
    if (limit != null && (limit < 1 || limit > 100)) {
      ctx.addIssue({ code: "custom", path: ["limit"], message: "invalid limit" })
    }
    return {
      limit: limit ?? 50,
      sort: parseEnumParam(value.sort, sortField, ctx, "sort") ?? DEFAULT_SORT,
      order: parseEnumParam(value.order, sortOrder, ctx, "order") ?? DEFAULT_ORDER,
      service: value.service,
      severity: parseSeverity(value.severity, ctx),
      message: value.message ?? value.body,
      traceId: parseTraceIdFilter(value.trace_id),
      sinceNs: parseSinceNs(value.since, ctx),
    }
  })
