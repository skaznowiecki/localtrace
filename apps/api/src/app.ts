import { Hono } from "hono"
import { cors } from "hono/cors"
import type { AppEnv, IngestGate } from "./app-env"
import type { Config } from "./config"
import type { Db } from "./db/client"
import { AppError } from "./lib/errors"
import { register as registerTraces } from "./features/traces"
import { register as registerLogs } from "./features/logs"
import { register as registerCatalog } from "./features/catalog"
import { register as registerIngest } from "./features/ingest"

export function createApp(deps: {
  db: Db
  config: Config
  ingestGate: IngestGate
}): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.use("*", async (c, next) => {
    c.set("db", deps.db)
    c.set("config", deps.config)
    c.set("ingestGate", deps.ingestGate)
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
    if (err instanceof AppError) {
      return c.json({ error: err.message }, err.status as 400 | 404 | 500)
    }
    console.error(err)
    return c.json({ error: err.message || "internal error" }, 500)
  })

  app.get("/health", (c) => c.json({ status: "ok" }))

  registerCatalog(app)
  registerLogs(app)
  registerTraces(app)
  registerIngest(app)

  return app
}
