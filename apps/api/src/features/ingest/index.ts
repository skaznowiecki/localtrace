import type { Hono } from "hono"
import type { AppEnv } from "../../app-env"
import { ingestRoutes } from "./http/routes"

export function register(app: Hono<AppEnv>): void {
  app.route("/", ingestRoutes())
}
