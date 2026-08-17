import type { Hono } from "hono"
import type { AppEnv } from "../../app-env"
import { tracesRoutes } from "./http/routes"

export function register(app: Hono<AppEnv>): void {
  app.route("/", tracesRoutes())
}

export { persistSpans } from "./services/persist"
