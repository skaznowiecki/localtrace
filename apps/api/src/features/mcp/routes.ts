import { createMcpHonoApp } from "@modelcontextprotocol/hono"
import { createMcpHandler } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import type { Context } from "hono"
import { createServer } from "./server"

type McpEnv = { Variables: { parsedBody?: unknown } }

export function routes(db: Db) {
  const handler = createMcpHandler(() => createServer(db))
  const app = createMcpHonoApp({
    host: "0.0.0.0",
    allowedHosts: ["127.0.0.1", "localhost"],
    allowedOrigins: ["127.0.0.1", "localhost"],
  })
  app.all("/", (c: Context) =>
    handler.fetch(c.req.raw, {
      parsedBody: (c as Context<McpEnv>).get("parsedBody"),
    }),
  )
  return app
}
