import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { BadRequestError } from "../../shared/errors"
import { IdError, normalizeTraceId } from "../../shared/helpers"
import type { AppEnv } from "../../app-env"
import * as facets from "./services/facets"
import * as list from "./services/list"
import * as withSpans from "./services/with-spans"

export function routes(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get("/facets", async (c) => {
    return c.json(await facets.execute(c.get("db")))
  })

  app.get(
    "/",
    zValidator("query", list.query, (result) => {
      if (result.success) return
      const issue = result.error.issues[0]
      throw new BadRequestError(issue?.message ?? "invalid query")
    }),
    async (c) => {
      return c.json(await list.execute(c.get("db"), c.req.valid("query")))
    },
  )

  app.get("/:id", async (c) => {
    let traceId: string
    try {
      traceId = normalizeTraceId(c.req.param("id"))
    } catch (err) {
      throw new BadRequestError(err instanceof IdError ? err.message : String(err))
    }
    return c.json(await withSpans.execute(c.get("db"), traceId))
  })

  return app
}
