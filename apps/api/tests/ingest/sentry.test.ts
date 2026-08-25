import { describe, expect, test } from "vitest"
import { httpAttrs, useTestApp } from "../helpers"

const TRACE_ID = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const ROOT_ID = "bbbbbbbbbbbbbbbb"
const CHILD_ID = "cccccccccccccccc"

function envelope(
  header: Record<string, unknown>,
  items: Array<{ type: string; payload: unknown }>,
): string {
  let out = JSON.stringify(header)
  for (const item of items) {
    out += `\n${JSON.stringify({ type: item.type })}\n${JSON.stringify(item.payload)}`
  }
  return out
}

const transaction = {
  event_id: "11111111111111111111111111111111",
  transaction: "GET /users",
  timestamp: 1_730_000_001,
  start_timestamp: 1_730_000_000,
  tags: { server_name: "api" },
  contexts: {
    trace: {
      trace_id: TRACE_ID,
      span_id: ROOT_ID,
      op: "http.server",
      status: "ok",
      data: {
        "http.method": "GET",
        "http.url": "http://localhost/users",
        "http.status_code": 200,
      },
    },
  },
  request: { method: "GET", url: "http://localhost/users" },
  spans: [
    {
      span_id: CHILD_ID,
      trace_id: TRACE_ID,
      op: "http.client",
      description: "GET /api",
      start_timestamp: 1_730_000_000.1,
      timestamp: 1_730_000_000.2,
      data: {
        "http.method": "GET",
        "http.url": "http://localhost/api",
        "http.status_code": 200,
      },
    },
  ],
}

const errorEvent = {
  event_id: "22222222222222222222222222222222",
  timestamp: 1_730_000_001,
  level: "error",
  message: "boom",
  tags: { server_name: "api" },
  contexts: {
    trace: {
      trace_id: TRACE_ID,
      span_id: ROOT_ID,
    },
  },
}

const ctx = useTestApp()

describe("sentry", () => {
  test("envelope transaction overlays HTTP attrs and classify; raw skips overlay", async () => {
    const ingest = await ctx.app.request("/api/1/envelope", {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body: envelope({ event_id: transaction.event_id }, [
        { type: "transaction", payload: transaction },
      ]),
    })
    expect(ingest.status).toBe(200)
    const ingestBody = (await ingest.json()) as { id?: string }
    expect(ingestBody.id).toBe(transaction.event_id)

    const detail = await ctx.app.request(`/api/traces/${TRACE_ID}`)
    expect(detail.status).toBe(200)
    const body = (await detail.json()) as {
      spans: Array<{
        name: string
        type?: string
        provider: string
        attributes: {
          http?: { method?: unknown; request?: { method?: unknown } }
        }
      }>
    }
    const root = body.spans.find((span) => span.name === "GET /users")!
    expect(root.provider).toBe("sentry")
    expect(root.type).toBe("http")
    expect(httpAttrs(root).method).toBe("GET")
    expect(httpAttrs(root).request?.method).toBe("GET")
    expect(body.spans).toHaveLength(2)

    const rawRes = await ctx.app.request(`/api/traces/${TRACE_ID}?raw=true`)
    const raw = (await rawRes.json()) as {
      spans: Array<{
        name: string
        type?: string
        attributes: {
          http?: { method?: unknown; request?: { method?: unknown } }
        }
      }>
    }
    const rawRoot = raw.spans.find((span) => span.name === "GET /users")!
    expect(rawRoot.type).toBeUndefined()
    expect(httpAttrs(rawRoot).method).toBe("GET")
    expect(httpAttrs(rawRoot).request).toBeUndefined()
  })

  test("trailing slash envelope path stores the same transaction", async () => {
    const ingest = await ctx.app.request("/api/1/envelope/", {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body: envelope({ event_id: transaction.event_id }, [
        { type: "transaction", payload: transaction },
      ]),
    })
    expect(ingest.status).toBe(200)

    const detail = await ctx.app.request(`/api/traces/${TRACE_ID}`)
    expect(detail.status).toBe(200)
    const body = (await detail.json()) as {
      spans: Array<{ provider: string; type?: string }>
    }
    expect(body.spans[0]!.provider).toBe("sentry")
    expect(body.spans[0]!.type).toBe("http")
  })

  test("envelope event correlates logs by trace id", async () => {
    await ctx.app.request("/api/1/envelope", {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body: envelope({ event_id: transaction.event_id }, [
        { type: "transaction", payload: transaction },
      ]),
    })
    const ingest = await ctx.app.request("/api/1/envelope", {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body: envelope({ event_id: errorEvent.event_id }, [
        { type: "event", payload: errorEvent },
      ]),
    })
    expect(ingest.status).toBe(200)

    const logsRes = await ctx.app.request(`/api/traces/${TRACE_ID}/logs`)
    expect(logsRes.status).toBe(200)
    const logs = (await logsRes.json()) as Array<{
      body: unknown
      provider: string
      trace_id: string | null
    }>
    expect(logs).toHaveLength(1)
    expect(logs[0]!.body).toBe("boom")
    expect(logs[0]!.provider).toBe("sentry")
    expect(logs[0]!.trace_id).toBe(TRACE_ID)
  })
})
