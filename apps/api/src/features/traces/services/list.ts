import * as z from "zod"
import type { Db } from "../../../shared/db"
import { card } from "../helpers/card"
import * as repo from "../repositories/traces"
import type { TraceCardDto } from "../types/dto"
import type { TraceListFilters } from "../types/span"

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
  })
  .transform((value, ctx): TraceListFilters => {
    const limit = parseIntParam(value.limit, ctx, "limit")
    if (limit != null && limit < 1) {
      ctx.addIssue({ code: "custom", path: ["limit"], message: "invalid limit" })
    }
    return {
      limit: limit ?? 50,
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

export async function execute(
  db: Db,
  filters: TraceListFilters,
): Promise<TraceCardDto[]> {
  const traces = await db.run((conn) => repo.list(conn, filters))
  return traces.map(card)
}
