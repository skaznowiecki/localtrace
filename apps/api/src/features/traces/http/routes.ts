import { Hono } from "hono"
import { BadRequestError, NotFoundError } from "../../../lib/errors"
import { IdError, normalizeTraceId } from "../../../lib/ids"
import type { AppEnv } from "../../../app-env"
import * as listService from "../services/list"
import type { TraceListFilters } from "../types/span"
import { traceCard, traceDetail, traceFacetsDto } from "./mappers"

function parseSinceNs(since: string | undefined): bigint | undefined {
  if (!since) return undefined
  const ms = Date.parse(since)
  if (Number.isNaN(ms)) {
    throw new BadRequestError(`invalid since (expected RFC3339): ${since}`)
  }
  if (ms < 0) {
    throw new BadRequestError("invalid since: timestamp must be non-negative")
  }
  return BigInt(ms) * 1_000_000n
}

function toFilters(query: Record<string, string | undefined>): TraceListFilters {
  const limit = query.limit ? Number.parseInt(query.limit, 10) : 50
  const httpStatus = query.http_status_code
    ? Number.parseInt(query.http_status_code, 10)
    : undefined
  return {
    limit: Number.isFinite(limit) ? limit : 50,
    service: query.service || undefined,
    status: query.status || undefined,
    method: query.method || undefined,
    httpStatusCode:
      httpStatus != null && Number.isFinite(httpStatus) ? httpStatus : undefined,
    name: query.name || undefined,
    url: query.url || undefined,
    durationMinNs: query.duration_min_ns
      ? BigInt(query.duration_min_ns)
      : undefined,
    durationMaxNs: query.duration_max_ns
      ? BigInt(query.duration_max_ns)
      : undefined,
    sinceNs: parseSinceNs(query.since),
  }
}

export function tracesRoutes(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get("/api/traces/facets", async (c) => {
    const facets = await listService.facets(c.get("db"))
    return c.json(traceFacetsDto(facets))
  })

  app.get("/api/traces", async (c) => {
    const query = c.req.query()
    const filters = toFilters(query)
    const traces = await listService.list(c.get("db"), filters)
    return c.json(traces.map(traceCard))
  })

  app.get("/api/traces/:id", async (c) => {
    let traceId: string
    try {
      traceId = normalizeTraceId(c.req.param("id"))
    } catch (err) {
      throw new BadRequestError(err instanceof IdError ? err.message : String(err))
    }
    const result = await listService.getWithSpans(c.get("db"), traceId)
    if (!result) throw new NotFoundError(`trace ${c.req.param("id")} not found`)
    return c.json(traceDetail(result.trace, result.spans))
  })

  return app
}
