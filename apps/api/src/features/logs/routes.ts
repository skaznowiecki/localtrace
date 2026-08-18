import { Hono } from "hono"
import { BadRequestError } from "../../shared/errors"
import { IdError, normalizeTraceId } from "../../shared/helpers"
import type { AppEnv } from "../../app-env"
import * as list from "./services/list"

export function routes(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get("/:id/logs", async (c) => {
    let traceId: string
    try {
      traceId = normalizeTraceId(c.req.param("id"))
    } catch (err) {
      throw new BadRequestError(err instanceof IdError ? err.message : String(err))
    }
    return c.json(await list.execute(c.get("db"), traceId))
  })

  return app
}
