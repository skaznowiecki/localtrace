import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { onInvalid } from "@shared/errors"
import type { AppEnv } from "@/app-env"
import * as querySchema from "./schemas/query"
import * as facets from "./services/facets"
import * as query from "./services/query"

export function routes(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get("/facets", async (c) => {
    return c.json(await facets.execute(c.get("db")))
  })

  app.get("/", zValidator("query", querySchema.query, onInvalid), async (c) => {
    return c.json(await query.execute(c.get("db"), c.req.valid("query")))
  })

  return app
}
