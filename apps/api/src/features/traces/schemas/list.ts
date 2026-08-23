import * as z from "zod"
import type {
  TraceListFilters,
  TraceSortField,
  TraceSortOrder,
} from "../types/span"

export const sortField = z.enum([
  "date",
  "root_service",
  "name",
  "duration",
  "spans",
  "status",
])

export const sortOrder = z.enum(["asc", "desc"])

const DEFAULT_SORT: TraceSortField = "date"
const DEFAULT_ORDER: TraceSortOrder = "desc"

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

function parseBigIntParam(
  raw: string | undefined,
  ctx: z.RefinementCtx,
  label: string,
): bigint | undefined {
  if (!raw) return undefined
  try {
    return BigInt(raw)
  } catch {
    ctx.addIssue({
      code: "custom",
      path: [label],
      message: `invalid ${label}`,
    })
    return z.NEVER
  }
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

export const input = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Max traces to return (default 50)"),
  service: z.string().optional().describe("Filter by root service name"),
  status: z.enum(["ok", "error"]).optional().describe("Trace status"),
  method: z.string().optional().describe("HTTP method, e.g. GET"),
  http_status_code: z.number().int().optional().describe("HTTP status code"),
  name: z.string().optional().describe("Substring match on root span name"),
  url: z.string().optional().describe("Substring match on HTTP URL"),
  duration_min_ms: z
    .number()
    .nonnegative()
    .optional()
    .describe("Minimum duration in milliseconds"),
  duration_max_ms: z
    .number()
    .nonnegative()
    .optional()
    .describe("Maximum duration in milliseconds"),
  since: z
    .iso
    .datetime({ offset: true })
    .optional()
    .describe("RFC3339 timestamp; only traces starting after this"),
  sort: sortField
    .optional()
    .describe(
      "Sort column (default date).",
    ),
  order: sortOrder.optional().describe("Sort direction (default desc)"),
})

function msToNs(ms: number | undefined): bigint | undefined {
  if (ms == null) return undefined
  return BigInt(Math.round(ms * 1_000_000))
}

export function filters(args: z.infer<typeof input>): TraceListFilters {
  return {
    limit: args.limit ?? 50,
    sort: args.sort ?? DEFAULT_SORT,
    order: args.order ?? DEFAULT_ORDER,
    service: args.service,
    status: args.status,
    method: args.method,
    httpStatusCode: args.http_status_code,
    name: args.name,
    url: args.url,
    durationMinNs: msToNs(args.duration_min_ms),
    durationMaxNs: msToNs(args.duration_max_ms),
    sinceNs:
      args.since != null ? BigInt(Date.parse(args.since)) * 1_000_000n : undefined,
  }
}

export const query = z
  .object({
    limit: qstr,
    service: qstr,
    status: qstr,
    method: qstr,
    http_status_code: qstr,
    name: qstr,
    url: qstr,
    duration_min_ns: qstr,
    duration_max_ns: qstr,
    since: qstr,
    sort: qstr,
    order: qstr,
  })
  .transform((value, ctx): TraceListFilters => {
    const limit = parseIntParam(value.limit, ctx, "limit")
    if (limit != null && limit < 1) {
      ctx.addIssue({ code: "custom", path: ["limit"], message: "invalid limit" })
    }
    return {
      limit: limit ?? 50,
      sort: parseEnumParam(value.sort, sortField, ctx, "sort") ?? DEFAULT_SORT,
      order: parseEnumParam(value.order, sortOrder, ctx, "order") ?? DEFAULT_ORDER,
      service: value.service,
      status: value.status,
      method: value.method,
      httpStatusCode: parseIntParam(value.http_status_code, ctx, "http_status_code"),
      name: value.name,
      url: value.url,
      durationMinNs: parseBigIntParam(value.duration_min_ns, ctx, "duration_min_ns"),
      durationMaxNs: parseBigIntParam(value.duration_max_ns, ctx, "duration_max_ns"),
      sinceNs: parseSinceNs(value.since, ctx),
    }
  })
