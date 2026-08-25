import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { onInvalid } from "@shared/errors"
import type { AppEnv } from "@/app-env"
import * as updateSchema from "./schemas/update"
import * as clear from "./services/clear"
import * as get from "./services/get"
import * as update from "./services/update"

export function routes(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get("/", async (c) => {
    return c.json(await get.execute(c.get("db"), c.get("config")))
  })

  app.put(
    "/",
    zValidator("json", updateSchema.body, onInvalid),
    async (c) => {
      return c.json(
        await update.execute(c.get("db"), c.get("config"), c.req.valid("json")),
      )
    },
  )

  app.post("/clear", async (c) => {
    return c.json(await clear.execute(c.get("db")))
  })

  return app
}
