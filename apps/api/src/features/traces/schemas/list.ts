import * as z from "zod"
import { windowNs } from "@shared/helpers"
import type {
  AttrFilter,
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

const qstrList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value): string[] => {
    if (value == null) return []
    return (Array.isArray(value) ? value : [value]).filter(
      (item) => item.length > 0,
    )
  })

const ATTR_KEY_RE = /^[A-Za-z0-9_.-]+$/

function parseAttrPairs(raw: string[], exclude: boolean): AttrFilter[] {
  const attrs: AttrFilter[] = []
  for (const item of raw) {
    const colon = item.indexOf(":")
    if (colon <= 0) continue
    const key = item.slice(0, colon).trim()
    const value = item.slice(colon + 1)
    if (!key || !value || !ATTR_KEY_RE.test(key)) continue
    attrs.push({ key, value, exclude })
  }
  return attrs
}

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
  until: z
    .iso
    .datetime({ offset: true })
    .optional()
    .describe("RFC3339 timestamp; only traces starting before this"),
  since_minutes: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Only traces from the last N minutes (preferred over since)"),
  until_minutes: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Only traces older than N minutes ago"),
  sort: sortField
    .optional()
    .describe(
      "Sort column (default date).",
    ),
  order: sortOrder.optional().describe("Sort direction (default desc)"),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Number of traces to skip (default 0)"),
  attr: z
    .array(z.string())
    .optional()
    .describe(
      'Span/resource attribute equality filters as path:value, e.g. ["account.id:123"]',
    ),
  attr_not: z
    .array(z.string())
    .optional()
    .describe(
      'Exclude traces with this span/resource attribute path:value, e.g. ["http.route:/health"]',
    ),
})

function msToNs(ms: number | undefined): bigint | undefined {
  if (ms == null) return undefined
  return BigInt(Math.round(ms * 1_000_000))
}

export function filters(args: z.infer<typeof input>): TraceListFilters {
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
    status: args.status,
    method: args.method,
    httpStatusCode: args.http_status_code,
    name: args.name,
    url: args.url,
    durationMinNs: msToNs(args.duration_min_ms),
    durationMaxNs: msToNs(args.duration_max_ms),
    sinceNs: window.sinceNs,
    untilNs: window.untilNs,
    attrs: [
      ...parseAttrPairs(args.attr ?? [], false),
      ...parseAttrPairs(args.attr_not ?? [], true),
    ],
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
    until: qstr,
    sort: qstr,
    order: qstr,
    offset: qstr,
    attr: qstrList,
    attr_not: qstrList,
  })
  .transform((value, ctx): TraceListFilters => {
    const limit = parseIntParam(value.limit, ctx, "limit")
    if (limit != null && limit < 1) {
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
      status: value.status,
      method: value.method,
      httpStatusCode: parseIntParam(value.http_status_code, ctx, "http_status_code"),
      name: value.name,
      url: value.url,
      durationMinNs: parseBigIntParam(value.duration_min_ns, ctx, "duration_min_ns"),
      durationMaxNs: parseBigIntParam(value.duration_max_ns, ctx, "duration_max_ns"),
      sinceNs: parseTimeNs(value.since, ctx, "since"),
      untilNs: parseTimeNs(value.until, ctx, "until"),
      attrs: [
        ...parseAttrPairs(value.attr, false),
        ...parseAttrPairs(value.attr_not, true),
      ],
    }
  })
