import type { Hono } from "hono"
import type { AppEnv } from "../../app-env"
import { logsRoutes } from "./http/routes"

export function register(app: Hono<AppEnv>): void {
  app.route("/", logsRoutes())
}

export { persistLogs } from "./services/persist"
