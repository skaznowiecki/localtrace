import { describe, expect, test } from "vitest"
import {
  GRPC_EXPORT_PATHS,
  grpcOnHttpHint,
} from "@/features/ingest/providers/otlp/helpers/grpc"
import { encodeProtobuf } from "@/features/ingest/providers/otlp/proto/protobuf"
import { httpAttrs, testConfig, useTestApp } from "../helpers"

const TRACE_ID = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const SPAN_ID = "bbbbbbbbbbbbbbbb"

function kv(key: string, stringValue: string) {
  return { key, value: { stringValue } }
}

function httpSpanRequest() {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [kv("service.name", "api")],
        },
        scopeSpans: [
          {
            spans: [
              {
                traceId: TRACE_ID,
                spanId: SPAN_ID,
                name: "GET /users",
                kind: 2,
                startTimeUnixNano: "1000000000",
                endTimeUnixNano: "6000000000",
                attributes: [
                  kv("http.method", "GET"),
                  kv("http.url", "http://localhost/users"),
                  kv("http.status_code", "200"),
                ],
              },
            ],
          },
        ],
      },
    ],
  }
}

function hexBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

const ctx = useTestApp()

describe("otlp", () => {
  test("JSON traces overlay HTTP attrs and classify; raw skips classify", async () => {
    const ingest = await ctx.app.request("/v1/traces", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(httpSpanRequest()),
    })
    expect(ingest.status).toBe(200)
    expect(await ingest.json()).toEqual({})

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
    expect(span.service).toBe("api")
    expect(span.provider).toBe("otlp")
    expect(span.type).toBe("http")
    expect(httpAttrs(span).method).toBe("GET")

    const rawRes = await ctx.app.request(`/api/traces/${TRACE_ID}?raw=true`)
    const raw = (await rawRes.json()) as {
      spans: Array<{ type?: string }>
    }
    expect(raw.spans[0]!.type).toBeUndefined()
  })

  test("JSON gzip traces store the same span", async () => {
    const gzipped = Bun.gzipSync(
      new TextEncoder().encode(JSON.stringify(httpSpanRequest())),
    )
    const ingest = await ctx.app.request("/v1/traces", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-encoding": "gzip",
      },
      body: gzipped,
    })
    expect(ingest.status).toBe(200)

    const detail = await ctx.app.request(`/api/traces/${TRACE_ID}`)
    expect(detail.status).toBe(200)
    const body = (await detail.json()) as {
      spans: Array<{ name: string; provider: string; type?: string }>
    }
    expect(body.spans[0]!.name).toBe("GET /users")
    expect(body.spans[0]!.provider).toBe("otlp")
    expect(body.spans[0]!.type).toBe("http")
  })

  test("protobuf traces ingest the same HTTP span", async () => {
    const proto = await encodeProtobuf(
      "opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest",
      {
        resourceSpans: [
          {
            resource: {
              attributes: [kv("service.name", "api")],
            },
            scopeSpans: [
              {
                spans: [
                  {
                    traceId: hexBytes(TRACE_ID),
                    spanId: hexBytes(SPAN_ID),
                    name: "GET /users",
                    kind: 2,
                    startTimeUnixNano: "1000000000",
                    endTimeUnixNano: "6000000000",
                    attributes: [
                      kv("http.method", "GET"),
                      kv("http.url", "http://localhost/users"),
                      kv("http.status_code", "200"),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    )
    const ingest = await ctx.app.request("/v1/traces", {
      method: "POST",
      headers: { "content-type": "application/x-protobuf" },
      body: proto,
    })
    expect(ingest.status).toBe(200)
    expect(await ingest.text()).toBe("")

    const detail = await ctx.app.request(`/api/traces/${TRACE_ID}`)
    expect(detail.status).toBe(200)
    const body = (await detail.json()) as {
      spans: Array<{ name: string; provider: string; type?: string; id: string }>
    }
    expect(body.spans[0]!.name).toBe("GET /users")
    expect(body.spans[0]!.provider).toBe("otlp")
    expect(body.spans[0]!.type).toBe("http")
    expect(body.spans[0]!.id).toBe(SPAN_ID)
  })

  test("JSON logs correlate by trace id", async () => {
    await ctx.app.request("/v1/traces", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(httpSpanRequest()),
    })
    const ingest = await ctx.app.request("/v1/logs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resourceLogs: [
          {
            resource: {
              attributes: [kv("service.name", "api")],
            },
            scopeLogs: [
              {
                logRecords: [
                  {
                    timeUnixNano: "2000000000",
                    severityText: "INFO",
                    body: { stringValue: "hello" },
                    traceId: TRACE_ID,
                    spanId: SPAN_ID,
                  },
                ],
              },
            ],
          },
        ],
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
    expect(logs[0]!.provider).toBe("otlp")
    expect(logs[0]!.trace_id).toBe(TRACE_ID)
  })

  test("JSON metrics return 200", async () => {
    const ingest = await ctx.app.request("/v1/metrics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resourceMetrics: [
          {
            resource: {
              attributes: [kv("service.name", "api")],
            },
            scopeMetrics: [
              {
                metrics: [
                  {
                    name: "app.requests",
                    gauge: {
                      dataPoints: [
                        {
                          asDouble: 1,
                          timeUnixNano: "1700000000000000000",
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        ],
      }),
    })
    expect(ingest.status).toBe(200)
  })

  test("application/grpc on HTTP is 415 with hint", async () => {
    const hint = grpcOnHttpHint(testConfig.grpcPort, testConfig.apiPort)
    const traces = await ctx.app.request("/v1/traces", {
      method: "POST",
      headers: { "content-type": "application/grpc" },
      body: new Uint8Array(),
    })
    expect(traces.status).toBe(415)
    expect(await traces.json()).toEqual({ error: hint })

    const exportPath = await ctx.app.request(GRPC_EXPORT_PATHS.traces, {
      method: "POST",
      headers: { "content-type": "application/grpc" },
      body: new Uint8Array(),
    })
    expect(exportPath.status).toBe(415)
    expect(await exportPath.json()).toEqual({ error: hint })
  })
})
