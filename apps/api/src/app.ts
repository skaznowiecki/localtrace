import { Hono } from "hono"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { logger } from "hono/logger"
import type { AppEnv } from "./app-env"
import type { Config } from "./config"
import type { Db } from "@shared/db"
import { AppError } from "@shared/errors"
import { log, setLevel } from "@shared/helpers"
import { routes as catalog } from "@features/catalog"
import {
  envelope as ingestEnvelope,
  mountAgent,
  routes as ingest,
} from "@features/ingest"
import { listRoutes as logsList, routes as logs } from "@features/logs"
import { routes as mcp } from "@features/mcp"
import { routes as traces } from "@features/traces"

export function createApp(deps: {
  db: Db
  config: Config
}): Hono<AppEnv> {
  setLevel(deps.config.logLevel)
  const app = new Hono<AppEnv>()

  app.use(logger(log))

  app.use("*", async (c, next) => {
    c.set("db", deps.db)
    c.set("config", deps.config)
    await next()
  })

  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["*"],
    }),
  )

  app.onError((err, c) => {
    if (err instanceof HTTPException) return err.getResponse()
    if (err instanceof AppError) {
      return c.json({ error: err.message }, err.status)
    }
    log.error(err)
    return c.json({ error: "internal error" }, 500)
  })

  app.notFound((c) => c.json({ error: "not found" }, 404))

  app.get("/health", (c) => c.json({ status: "ok" }))

  mountAgent(app, deps.config.otlpMaxBodyBytes)

  app.route("/mcp", mcp(deps.db))
  app.route("/api/logs", logsList())
  app.route("/api/traces", logs())
  app.route("/api/traces", traces())
  app.route("/api/services", catalog())
  app.route("/api", ingestEnvelope(deps.config.otlpMaxBodyBytes))
  app.route("/v1", ingest(deps.config.otlpMaxBodyBytes))

  return app
}
