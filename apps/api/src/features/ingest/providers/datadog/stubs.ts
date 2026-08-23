import type { Hono } from "hono"
import type { AppEnv } from "@/app-env"
import { jsonOk } from "./helpers/paths"

export function mountStubs(app: Hono<AppEnv>): void {
  app.on(["PUT", "POST"], "/v0.4/services", () => jsonOk())
  app.post("/v0.6/stats", () => jsonOk())
  app.on(["GET", "POST"], "/v0.7/config", () => jsonOk())
  app.post("/telemetry/proxy/api/v2/apmtelemetry", () => jsonOk())
}
