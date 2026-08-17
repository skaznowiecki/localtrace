import type { Hono } from "hono"
import type { AppEnv } from "../../app-env"
import { catalogRoutes } from "./http/routes"

export function register(app: Hono<AppEnv>): void {
  app.route("/", catalogRoutes())
}
