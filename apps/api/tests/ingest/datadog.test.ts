import { describe, expect, test } from "vitest"
import { encode } from "@msgpack/msgpack"
import { httpAttrs, useTestApp } from "../helpers"

const TRACE_ID = "00000000000000000000000000000001"
const SPAN_ID = "0000000000000002"

const namedSpan = {
  service: "web",
  name: "http.request",
  resource: "GET /users",
  trace_id: 1,
  span_id: 2,
  parent_id: 0,
  start: 1_000_000_000,
  duration: 5_000_000,
  error: 0,
  meta: {
    "http.method": "GET",
    "http.url": "http://localhost/users",
    "http.status_code": "200",
  },
  metrics: {},
  type: "web",
}

const ctx = useTestApp()

describe("datadog agent", () => {
  test("GET /info lists implemented endpoints and does not advertise v1.0", async () => {
    const res = await ctx.app.request("/info")
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      endpoints: string[]
      client_drop_p0s: boolean
    }
    expect(body.endpoints).toContain("/v0.5/traces")
    expect(body.endpoints).toContain("/v0.7/traces")
    expect(body.endpoints).not.toContain("/v1.0/traces")
    expect(body.client_drop_p0s).toBe(false)
  })

  test("v0.3 traces return empty 200", async () => {
    const res = await ctx.app.request("/v0.3/traces", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([[namedSpan]]),
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("")
  })

  test("v0.4 json traces overlay HTTP attrs and classify; raw skips overlay", async () => {
    const ingest = await ctx.app.request("/v0.4/traces", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([[namedSpan]]),
    })
    expect(ingest.status).toBe(200)
    expect(await ingest.json()).toEqual({
      rate_by_service: { "service:,env:": 1 },
    })

    const detail = await ctx.app.request(`/api/traces/${TRACE_ID}`)
    expect(detail.status).toBe(200)
    const body = (await detail.json()) as {
      spans: Array<{
        name: string
        service: string
        type?: string
        provider: string
        attributes: {
          http?: { method?: unknown; request?: { method?: unknown } }
        }
      }>
    }
    const span = body.spans[0]!
    expect(span.name).toBe("GET /users")
    expect(span.service).toBe("web")
    expect(span.provider).toBe("datadog")
    expect(span.type).toBe("http")
    expect(httpAttrs(span).method).toBe("GET")
    expect(httpAttrs(span).request?.method).toBe("GET")

    const rawRes = await ctx.app.request(`/api/traces/${TRACE_ID}?raw=true`)
    const raw = (await rawRes.json()) as {
      spans: Array<{
        type?: string
        attributes: {
          http?: { method?: unknown; request?: { method?: unknown } }
        }
      }>
    }
    const rawSpan = raw.spans[0]!
    expect(rawSpan.type).toBeUndefined()
    expect(httpAttrs(rawSpan).method).toBe("GET")
    expect(httpAttrs(rawSpan).request).toBeUndefined()
  })

  test("v0.5 dictionary msgpack matches v0.4 json for the same span", async () => {
    const dict = [
      "",
      "web",
      "http.request",
      "GET /users",
      "web",
      "http.method",
      "GET",
      "http.url",
      "http://localhost/users",
      "http.status_code",
      "200",
    ]
    const slots = [
      1,
      2,
      3,
      1,
      2,
      0,
      1_000_000_000,
      5_000_000,
      0,
      { 5: 6, 7: 8, 9: 10 },
      {},
      4,
    ]
    const ingest = await ctx.app.request("/v0.5/traces", {
      method: "PUT",
      headers: { "content-type": "application/msgpack" },
      body: new Uint8Array(encode([dict, [[slots]]])),
    })
    expect(ingest.status).toBe(200)

    const detail = await ctx.app.request(`/api/traces/${TRACE_ID}`)
    const body = (await detail.json()) as {
      spans: Array<{ name: string; service: string; provider: string; id: string }>
    }
    expect(body.spans[0]!.name).toBe("GET /users")
    expect(body.spans[0]!.service).toBe("web")
    expect(body.spans[0]!.provider).toBe("datadog")
    expect(body.spans[0]!.id).toBe(SPAN_ID)
  })

  test("Java v0.5 probe [[],[]] returns 200", async () => {
    const res = await ctx.app.request("/v0.5/traces", {
      method: "PUT",
      headers: { "content-type": "application/msgpack" },
      body: new Uint8Array(encode([[], []])),
    })
    expect(res.status).toBe(200)
  })

  test("v0.7 TracerPayload chunks ingest named spans", async () => {
    const ingest = await ctx.app.request("/v0.7/traces", {
      method: "PUT",
      headers: { "content-type": "application/msgpack" },
      body: new Uint8Array(encode({ chunks: [{ spans: [namedSpan] }] })),
    })
    expect(ingest.status).toBe(200)

    const detail = await ctx.app.request(`/api/traces/${TRACE_ID}`)
    expect(detail.status).toBe(200)
    const body = (await detail.json()) as {
      spans: Array<{ name: string; provider: string }>
    }
    expect(body.spans[0]!.name).toBe("GET /users")
    expect(body.spans[0]!.provider).toBe("datadog")
  })

  test("POST /v1/input stores logs correlated by dd.trace_id", async () => {
    await ctx.app.request("/v0.4/traces", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([[namedSpan]]),
    })
    const ingest = await ctx.app.request("/v1/input", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "hello",
        service: "web",
        status: "info",
        "dd.trace_id": "1",
        "dd.span_id": "2",
      }),
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
    expect(logs[0]!.body).toBe("hello")
    expect(logs[0]!.provider).toBe("datadog")
    expect(logs[0]!.trace_id).toBe(TRACE_ID)
  })

  test("POST /api/v1/series and /v0.6/stats return 200", async () => {
    const series = await ctx.app.request("/api/v1/series", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        series: [
          {
            metric: "app.requests",
            points: [[1_700_000_000, 1]],
            type: "gauge",
            host: "web",
          },
        ],
      }),
    })
    expect(series.status).toBe(200)

    const stats = await ctx.app.request("/v0.6/stats", { method: "POST" })
    expect(stats.status).toBe(200)
  })
})
