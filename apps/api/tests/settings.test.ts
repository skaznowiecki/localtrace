import { describe, expect, test } from "vitest"
import { prune } from "@features/settings"
import { testConfig, useTestApp } from "./helpers"

const HOUR_NS = 3_600_000_000_000n
const ctx = useTestApp()

async function count(table: string): Promise<number> {
  const rows = await ctx.db.run((conn) =>
    conn.all(`SELECT count(*) AS n FROM ${table}`),
  )
  return Number(rows[0]?.n ?? 0)
}

async function insertRow(timeNs: bigint, id: string): Promise<void> {
  await ctx.db.run(async (conn) => {
    await conn.run(
      `INSERT INTO traces (
         trace_id, root_observed, start_time_ns, end_time_ns, duration_ns,
         status_code, span_count
       ) VALUES (?, 1, ?, ?, 1, 'ok', 1)`,
      [id, timeNs, timeNs + 1n],
    )
    await conn.run(
      `INSERT INTO spans (
         trace_id, span_id, name, kind, start_time_ns, end_time_ns, duration_ns,
         status_code, flags, dropped_attributes_count, dropped_events_count,
         dropped_links_count, service_name, resource_dropped_attributes_count,
         scope_dropped_attributes_count, ingest_provider
       ) VALUES (?, ?, 'span', 1, ?, ?, 1, 1, 0, 0, 0, 0, 'svc', 0, 0, 'otlp')`,
      [id, id.slice(0, 16), timeNs, timeNs + 1n],
    )
    await conn.run(
      `INSERT INTO logs (
         id, time_ns, resource_dropped_attributes_count,
         scope_dropped_attributes_count, dropped_attributes_count, flags,
         ingest_provider
       ) VALUES (?, ?, 0, 0, 0, 0, 'otlp')`,
      [`log-${id}`, timeNs],
    )
    await conn.run(
      `INSERT INTO metrics (
         id, name, metric_type, resource_dropped_attributes_count,
         scope_dropped_attributes_count, time_ns, flags, data, ingest_provider
       ) VALUES (?, 'm', 1, 0, 0, ?, 0, '{}', 'otlp')`,
      [`metric-${id}`, timeNs],
    )
  })
}

describe("settings", () => {
  test("GET defaults to 24h and local ingest endpoints", async () => {
    const res = await ctx.app.request("/api/settings")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      retentionHours: 24,
      endpoints: {
        otlp: "http://127.0.0.1:4318",
        otlpGrpc: "http://127.0.0.1:4317",
        sentryDsn: "http://local@127.0.0.1:4318/1",
        datadog: "http://127.0.0.1:4318",
        mcp: "http://127.0.0.1:4318/mcp",
      },
    })
  })

  test("PUT 168 persists and GET returns it", async () => {
    const put = await ctx.app.request("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ retentionHours: 168 }),
    })
    expect(put.status).toBe(200)
    expect(await put.json()).toMatchObject({ retentionHours: 168 })

    const get = await ctx.app.request("/api/settings")
    expect(await get.json()).toMatchObject({ retentionHours: 168 })
  })

  test("PUT rejects a non-preset retention", async () => {
    const res = await ctx.app.request("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ retentionHours: 48 }),
    })
    expect(res.status).toBe(400)
  })

  test("prune deletes rows older than retention and keeps fresh ones", async () => {
    const nowNs = BigInt(Date.now()) * 1_000_000n
    await insertRow(nowNs - 48n * HOUR_NS, "oldoldoldoldoldoldoldoldoldold01")
    await insertRow(nowNs - 1n * HOUR_NS, "newnewnewnewnewnewnewnewnewnew01")

    await prune(ctx.db, testConfig)

    expect(await count("traces")).toBe(1)
    expect(await count("spans")).toBe(1)
    expect(await count("logs")).toBe(1)
    expect(await count("metrics")).toBe(1)
    const traces = await ctx.db.run((conn) =>
      conn.all("SELECT trace_id FROM traces"),
    )
    expect(traces[0]?.trace_id).toBe("newnewnewnewnewnewnewnewnewnew01")
  })

  test("clear empties telemetry and keeps retention", async () => {
    const nowNs = BigInt(Date.now()) * 1_000_000n
    await insertRow(nowNs, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    await ctx.app.request("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ retentionHours: 168 }),
    })

    const clear = await ctx.app.request("/api/settings/clear", { method: "POST" })
    expect(clear.status).toBe(200)
    expect(await clear.json()).toEqual({ ok: true })

    expect(await count("traces")).toBe(0)
    expect(await count("spans")).toBe(0)
    expect(await count("logs")).toBe(0)
    expect(await count("metrics")).toBe(0)

    const get = await ctx.app.request("/api/settings")
    expect(await get.json()).toMatchObject({ retentionHours: 168 })
  })
})
