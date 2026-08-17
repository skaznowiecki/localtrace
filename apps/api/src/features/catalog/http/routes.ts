import { Hono } from "hono"
import type { AppEnv } from "../../../app-env"
import * as listService from "../services/list"
import { serviceCard } from "./mappers"

export function catalogRoutes(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()
  app.get("/api/services", async (c) => {
    const services = await listService.list(c.get("db"))
    return c.json(services.map(serviceCard))
  })
  return app
}
