import * as z from "zod"
import { rawInput, windowNs } from "@shared/helpers"
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

function parseTimeNs(
  raw: string | undefined,
  ctx: z.RefinementCtx,
  label: string,
): bigint | undefined {
  if (!raw) return undefined
  const ms = Date.parse(raw)
  if (Number.isNaN(ms)) {
    ctx.addIssue({
      code: "custom",
      path: [label],
      message: `invalid ${label} (expected RFC3339): ${raw}`,
    })
    return z.NEVER
  }
  if (ms < 0) {
    ctx.addIssue({
      code: "custom",
      path: [label],
      message: `invalid ${label}: timestamp must be non-negative`,
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
  until: z
    .iso
    .datetime({ offset: true })
    .optional()
    .describe("RFC3339 timestamp; only logs before this"),
  since_minutes: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Only logs from the last N minutes (preferred over since)"),
  until_minutes: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Only logs older than N minutes ago"),
  sort: sortField.optional().describe("Sort column (default date)"),
  order: sortOrder.optional().describe("Sort direction (default desc)"),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Number of logs to skip (default 0)"),
  raw: rawInput,
})

export function filters(args: z.infer<typeof input>): LogListFilters {
  const window = windowNs({
    since: args.since,
    until: args.until,
    since_minutes: args.since_minutes,
    until_minutes: args.until_minutes,
  })
  return {
    limit: args.limit ?? 50,
    offset: args.offset ?? 0,
    sort: args.sort ?? DEFAULT_SORT,
    order: args.order ?? DEFAULT_ORDER,
    service: args.service,
    severity: args.severity,
    message: args.message,
    traceId: args.trace_id ? parseTraceIdFilter(args.trace_id) : undefined,
    sinceNs: window.sinceNs,
    untilNs: window.untilNs,
    raw: args.raw,
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
    until: qstr,
    sort: qstr,
    order: qstr,
    offset: qstr,
    raw: qstr,
  })
  .transform((value, ctx): LogListFilters => {
    const limit = parseIntParam(value.limit, ctx, "limit")
    if (limit != null && (limit < 1 || limit > 100)) {
      ctx.addIssue({ code: "custom", path: ["limit"], message: "invalid limit" })
    }
    const offset = parseIntParam(value.offset, ctx, "offset")
    if (offset != null && offset < 0) {
      ctx.addIssue({ code: "custom", path: ["offset"], message: "invalid offset" })
    }
    return {
      limit: limit ?? 50,
      offset: offset ?? 0,
      sort: parseEnumParam(value.sort, sortField, ctx, "sort") ?? DEFAULT_SORT,
      order: parseEnumParam(value.order, sortOrder, ctx, "order") ?? DEFAULT_ORDER,
      service: value.service,
      severity: parseSeverity(value.severity, ctx),
      message: value.message ?? value.body,
      traceId: parseTraceIdFilter(value.trace_id),
      sinceNs: parseTimeNs(value.since, ctx, "since"),
      untilNs: parseTimeNs(value.until, ctx, "until"),
      raw: value.raw === "true" || value.raw === "1",
    }
  })
