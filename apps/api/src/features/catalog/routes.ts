import { Hono } from "hono"
import type { AppEnv } from "@/app-env"
import * as list from "./services/list"

export function routes(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()
  app.get("/", async (c) => {
    return c.json(await list.execute(c.get("db")))
  })
  return app
}
