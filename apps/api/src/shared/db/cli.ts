import { loadConfig } from "../../config"
import { migrateDb } from "./client"

const config = loadConfig()
const { from, to } = await migrateDb(config.databasePath)

if (from === to) {
  console.info(`already at v${to}`)
} else {
  console.info(`migrated v${from} → v${to}`)
}
