import { createApp } from "./app"
import { IngestGate } from "./app-env"
import { loadConfig } from "./config"
import { openDb } from "./db/client"

const config = loadConfig()
const db = await openDb(config.databasePath)
const ingestGate = new IngestGate(config.otlpMaxInFlight)
const app = createApp({ db, config, ingestGate })

const addr = `0.0.0.0:${config.apiPort}`
console.info(`starting local-tracer api on ${addr}`)

export default {
  port: config.apiPort,
  hostname: "0.0.0.0",
  fetch: app.fetch,
}
