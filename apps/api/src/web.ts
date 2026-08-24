import { serveStatic } from "hono/bun"
import type { Hono } from "hono"
import type { AppEnv } from "./app-env"

const EXACT = new Set(["/health", "/info", "/mcp", "/api", "/v1", "/telemetry"])

const PREFIXES = ["/api/", "/v1/", "/mcp/", "/v0.", "/telemetry/"]

export function isReservedPath(path: string): boolean {
  if (EXACT.has(path)) return true
  return PREFIXES.some((prefix) => path.startsWith(prefix))
}

function looksLikeFile(path: string): boolean {
  const leaf = path.split("/").filter(Boolean).at(-1) ?? ""
  return leaf.includes(".")
}

export function mountWeb(app: Hono<AppEnv>, webRoot: string): void {
  const file = serveStatic({ root: webRoot })
  const index = serveStatic({ root: webRoot, path: "index.html" })

  app.use("*", async (c, next) => {
    if (c.req.method !== "GET" && c.req.method !== "HEAD") return next()
    if (isReservedPath(c.req.path)) return next()
    if (looksLikeFile(c.req.path)) return file(c, next)
    return index(c, next)
  })
}
