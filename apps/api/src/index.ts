import { createApp } from "./app"
import { loadConfig } from "./config"
import { openDb, type Db } from "@shared/db"
import { log, setLevel } from "@shared/helpers"
import { breakdown } from "@features/traces"
import { createPoller, type Poller } from "./infra/poller"

type Hot = {
  db?: Db
  databasePath?: string
  signals?: boolean
  poller?: Poller
}

const hot = ((globalThis as typeof globalThis & { __localTracer?: Hot })
  .__localTracer ??= {})

const config = loadConfig()
setLevel(config.logLevel)

if (hot.db && hot.databasePath !== config.databasePath) {
  hot.poller?.stop()
  hot.poller = undefined
  await hot.db.close()
  hot.db = undefined
}

const fresh = !hot.db
const db = hot.db ?? (await openDb(config.databasePath))
hot.db = db
hot.databasePath = config.databasePath
if (fresh) {
  log(`starting local-tracer api on 0.0.0.0:${config.apiPort}`)
  log(`sentry dsn http://local@127.0.0.1:${config.apiPort}/1`)
  log(`datadog DD_TRACE_AGENT_URL=http://127.0.0.1:${config.apiPort}`)
  if (config.webRoot) log(`serving ui from ${config.webRoot}`)
}

if (!hot.poller || hot.poller.kind !== "sleep") {
  hot.poller?.stop()
  hot.poller = createPoller()
}
hot.poller.every(500, async () => {
  try {
    await breakdown(db)
  } catch (err) {
    log.error(err)
  }
})

const app = createApp({ db, config })

async function shutdown(signal: string) {
  log(`received ${signal}, shutting down`)
  hot.poller?.stop()
  hot.poller = undefined
  await hot.db?.close()
  hot.db = undefined
  process.exit(0)
}

if (!hot.signals) {
  hot.signals = true
  process.once("SIGTERM", () => void shutdown("SIGTERM"))
  process.once("SIGINT", () => void shutdown("SIGINT"))
}

export default {
  port: config.apiPort,
  hostname: "0.0.0.0",
  fetch: app.fetch,
  maxRequestBodySize: config.otlpMaxBodyBytes,
  // 0 = disable. Default 10s can drop a large OTLP batch while SQLite writes.
  idleTimeout: 0,
}
