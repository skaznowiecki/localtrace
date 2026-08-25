import * as z from "zod"
import { windowNs } from "@shared/helpers"
import type {
  MetricQueryFilters,
  MetricSortField,
  MetricSortOrder,
} from "../types/dto"

export const sortField = z.enum(["date", "name", "service"])
export const sortOrder = z.enum(["asc", "desc"])

const DEFAULT_SORT: MetricSortField = "date"
const DEFAULT_ORDER: MetricSortOrder = "desc"

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

export const input = z.object({
  name: z
    .string()
    .optional()
    .describe("Metric name; omit to list recent points across names"),
  service: z.string().optional().describe("Filter by service name"),
  since: z
    .iso
    .datetime({ offset: true })
    .optional()
    .describe("RFC3339 timestamp; only points after this"),
  until: z
    .iso
    .datetime({ offset: true })
    .optional()
    .describe("RFC3339 timestamp; only points before this"),
  since_minutes: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Only points from the last N minutes (preferred over since)"),
  until_minutes: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Only points older than N minutes ago"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Max points to return (default 100)"),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Number of points to skip (default 0)"),
  sort: sortField.optional().describe("Sort column (default date)"),
  order: sortOrder.optional().describe("Sort direction (default desc)"),
})

export function filters(args: z.infer<typeof input>): MetricQueryFilters {
  const window = windowNs({
    since: args.since,
    until: args.until,
    since_minutes: args.since_minutes,
    until_minutes: args.until_minutes,
  })
  return {
    name: args.name,
    service: args.service,
    sinceNs: window.sinceNs,
    untilNs: window.untilNs,
    limit: args.limit ?? 100,
    offset: args.offset ?? 0,
    sort: args.sort ?? DEFAULT_SORT,
    order: args.order ?? DEFAULT_ORDER,
  }
}

export const query = z
  .object({
    name: qstr,
    service: qstr,
    since: qstr,
    until: qstr,
    sort: qstr,
    order: qstr,
    limit: qstr,
    offset: qstr,
  })
  .transform((value, ctx): MetricQueryFilters => {
    const limit = parseIntParam(value.limit, ctx, "limit")
    if (limit != null && (limit < 1 || limit > 100)) {
      ctx.addIssue({ code: "custom", path: ["limit"], message: "invalid limit" })
    }
    const offset = parseIntParam(value.offset, ctx, "offset")
    if (offset != null && offset < 0) {
      ctx.addIssue({ code: "custom", path: ["offset"], message: "invalid offset" })
    }
    return {
      name: value.name,
      service: value.service,
      sinceNs: parseTimeNs(value.since, ctx, "since"),
      untilNs: parseTimeNs(value.until, ctx, "until"),
      limit: limit ?? 50,
      offset: offset ?? 0,
      sort: parseEnumParam(value.sort, sortField, ctx, "sort") ?? DEFAULT_SORT,
      order: parseEnumParam(value.order, sortOrder, ctx, "order") ?? DEFAULT_ORDER,
    }
  })
