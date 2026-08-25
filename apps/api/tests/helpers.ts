import { afterEach, beforeEach } from "vitest"
import { createApp } from "@/app"
import type { Config } from "@/config"
import { openDb, type Db } from "@shared/db"

export const testConfig: Config = {
  databasePath: ":memory:",
  apiPort: 4318,
  grpcPort: 4317,
  logLevel: "silent",
  otlpMaxBodyBytes: 16 * 1024 * 1024,
  retentionHours: 24,
}

export type TestApp = ReturnType<typeof createApp>

export function httpAttrs(span: {
  attributes: { http?: { method?: unknown; request?: { method?: unknown } } }
}) {
  return span.attributes.http ?? {}
}

export function useTestApp(config: Config = testConfig): {
  get app(): TestApp
  get db(): Db
} {
  let db: Db
  let app: TestApp

  beforeEach(async () => {
    db = await openDb(":memory:")
    app = createApp({ db, config })
  })

  afterEach(async () => {
    await db.close()
  })

  return {
    get app() {
      return app
    },
    get db() {
      return db
    },
  }
}
