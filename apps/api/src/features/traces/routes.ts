import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { onInvalid } from "@shared/errors"
import type { AppEnv } from "@/app-env"
import * as listSchema from "./schemas/list"
import * as sqlSchema from "./schemas/sql"
import * as withSpansSchema from "./schemas/with-spans"
import * as facets from "./services/facets"
import * as list from "./services/list"
import * as sql from "./services/sql"
import * as withSpans from "./services/with-spans"

export function routes(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get("/facets", async (c) => {
    return c.json(await facets.execute(c.get("db")))
  })

  app.get("/", zValidator("query", listSchema.query, onInvalid), async (c) => {
    return c.json(await list.execute(c.get("db"), c.req.valid("query")))
  })

  app.get("/:id/sql", zValidator("param", sqlSchema.param, onInvalid), async (c) => {
    return c.json(await sql.execute(c.get("db"), c.req.valid("param").id))
  })

  app.get("/:id", zValidator("param", withSpansSchema.param, onInvalid), async (c) => {
    return c.json(await withSpans.execute(c.get("db"), c.req.valid("param").id))
  })

  return app
}
