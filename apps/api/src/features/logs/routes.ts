import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { onInvalid } from "@shared/errors"
import type { AppEnv } from "@/app-env"
import * as forTraceSchema from "./schemas/for-trace"
import * as listSchema from "./schemas/list"
import * as facets from "./services/facets"
import * as forTrace from "./services/for-trace"
import * as list from "./services/list"

export function routes(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get(
    "/:id/logs",
    zValidator("param", forTraceSchema.param, onInvalid),
    zValidator("query", forTraceSchema.query, onInvalid),
    async (c) => {
      return c.json(
        await forTrace.execute(
          c.get("db"),
          c.req.valid("param").id,
          c.req.valid("query").raw ?? false,
        ),
      )
    },
  )

  return app
}

export function listRoutes(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get("/facets", async (c) => {
    return c.json(await facets.execute(c.get("db")))
  })

  app.get("/", zValidator("query", listSchema.query, onInvalid), async (c) => {
    return c.json(await list.execute(c.get("db"), c.req.valid("query")))
  })

  return app
}
