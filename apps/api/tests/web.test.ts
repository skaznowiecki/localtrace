import { afterEach, describe, expect, test } from "vitest"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createApp } from "@/app"
import { openDb, type Db } from "@shared/db"
import { isReservedPath } from "@/web"
import { testConfig } from "./helpers"

describe("isReservedPath", () => {
  test("keeps api and ingest paths off the spa fallback", () => {
    expect(isReservedPath("/health")).toBe(true)
    expect(isReservedPath("/info")).toBe(true)
    expect(isReservedPath("/mcp")).toBe(true)
    expect(isReservedPath("/mcp/foo")).toBe(true)
    expect(isReservedPath("/api/traces")).toBe(true)
    expect(isReservedPath("/v1/traces")).toBe(true)
    expect(isReservedPath("/v0.4/traces")).toBe(true)
    expect(isReservedPath("/v0.7/config")).toBe(true)
    expect(isReservedPath("/telemetry/proxy/api/v2/apmtelemetry")).toBe(true)
    expect(isReservedPath("/traces")).toBe(false)
    expect(isReservedPath("/logs")).toBe(false)
    expect(isReservedPath("/assets/index.js")).toBe(false)
  })
})

describe("mountWeb", () => {
  let db: Db
  let root: string

  afterEach(async () => {
    await db?.close()
    if (root) await rm(root, { recursive: true, force: true })
  })

  test("without webRoot, unknown GET paths stay json 404", async () => {
    db = await openDb(":memory:")
    const app = createApp({ db, config: testConfig })
    const res = await app.request("/traces")
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "not found" })
  })

  test("with webRoot, spa routes get index.html and api misses stay json", async () => {
    root = await mkdtemp(join(tmpdir(), "lt-web-"))
    await Bun.write(join(root, "index.html"), "<!doctype html><title>ui</title>")
    await Bun.write(join(root, "assets/app.js"), "console.log(1)")

    db = await openDb(":memory:")
    const app = createApp({
      db,
      config: { ...testConfig, webRoot: root },
    })

    const spa = await app.request("/traces")
    expect(spa.status).toBe(200)
    expect(await spa.text()).toContain("<title>ui</title>")

    const asset = await app.request("/assets/app.js")
    expect(asset.status).toBe(200)
    expect(await asset.text()).toBe("console.log(1)")

    const missingApi = await app.request("/api/does-not-exist")
    expect(missingApi.status).toBe(404)
    expect(await missingApi.json()).toEqual({ error: "not found" })

    const info = await app.request("/info")
    expect(info.status).toBe(200)
    const body = (await info.json()) as { endpoints: string[] }
    expect(body.endpoints).toContain("/v0.4/traces")

    const health = await app.request("/health")
    expect(health.status).toBe(200)
    expect(await health.json()).toEqual({ status: "ok" })
  })
})
