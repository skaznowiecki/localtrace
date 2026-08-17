import { Hono } from "hono"
import { BadRequestError } from "../../../lib/errors"
import { IdError, normalizeTraceId } from "../../../lib/ids"
import type { AppEnv } from "../../../app-env"
import * as listService from "../services/list"
import { logDto } from "./mappers"

export function logsRoutes(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get("/api/traces/:id/logs", async (c) => {
    let traceId: string
    try {
      traceId = normalizeTraceId(c.req.param("id"))
    } catch (err) {
      throw new BadRequestError(err instanceof IdError ? err.message : String(err))
    }
    const logs = await listService.listForTrace(c.get("db"), traceId)
    return c.json(logs.map(logDto))
  })

  return app
}
