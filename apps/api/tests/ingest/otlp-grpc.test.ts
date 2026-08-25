import { connect } from "node:http2"
import { describe, expect, test } from "vitest"
import { IngestError } from "@/features/ingest/providers/errors"
import { GRPC_EXPORT_PATHS } from "@/features/ingest/providers/otlp/helpers/grpc"
import { encodeProtobuf } from "@/features/ingest/providers/otlp/proto/protobuf"
import { encodeFrame } from "@/features/ingest/providers/otlp/grpc/frame"
import { execute } from "@/features/ingest/providers/otlp/grpc/handle"
import { listen } from "@/features/ingest/providers/otlp/grpc/listen"
import { testConfig, useTestApp } from "../helpers"

const TRACE_TYPE =
  "opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest"
const TRACE_ID_HEX = "01010101010101010101010101010101"

async function traceExport(): Promise<Uint8Array> {
  return encodeProtobuf(TRACE_TYPE, {
    resourceSpans: [
      {
        scopeSpans: [
          {
            spans: [
              {
                traceId: Buffer.alloc(16, 1),
                spanId: Buffer.alloc(8, 2),
                name: "grpc.test",
                startTimeUnixNano: "1",
                endTimeUnixNano: "2",
              },
            ],
          },
        ],
      },
    ],
  })
}

const ctx = useTestApp()

describe("grpc handle", () => {
  test("Export traces stores a span", async () => {
    await execute({
      db: ctx.db,
      path: GRPC_EXPORT_PATHS.traces,
      body: encodeFrame(await traceExport()),
      maxBytes: testConfig.otlpMaxBodyBytes,
    })

    const detail = await ctx.app.request(`/api/traces/${TRACE_ID_HEX}`)
    expect(detail.status).toBe(200)
    const body = (await detail.json()) as {
      spans: Array<{ name: string; provider: string }>
    }
    expect(body.spans[0]?.name).toBe("grpc.test")
    expect(body.spans[0]?.provider).toBe("otlp")
  })

  test("gzip-framed traces store a span", async () => {
    const proto = await traceExport()
    const gz = Bun.gzipSync(Buffer.from(proto))
    await execute({
      db: ctx.db,
      path: GRPC_EXPORT_PATHS.traces,
      body: encodeFrame(gz, true),
      encoding: "gzip",
      maxBytes: testConfig.otlpMaxBodyBytes,
    })
    const detail = await ctx.app.request(`/api/traces/${TRACE_ID_HEX}`)
    expect(detail.status).toBe(200)
  })

  test("empty logs and metrics Export succeed", async () => {
    await execute({
      db: ctx.db,
      path: GRPC_EXPORT_PATHS.logs,
      body: encodeFrame(new Uint8Array()),
      maxBytes: testConfig.otlpMaxBodyBytes,
    })
    await execute({
      db: ctx.db,
      path: GRPC_EXPORT_PATHS.metrics,
      body: encodeFrame(new Uint8Array()),
      maxBytes: testConfig.otlpMaxBodyBytes,
    })
  })

  test("unknown method throws unsupported_protocol", async () => {
    try {
      await execute({
        db: ctx.db,
        path: "/nope.Service/Export",
        body: encodeFrame(new Uint8Array()),
        maxBytes: testConfig.otlpMaxBodyBytes,
      })
      throw new Error("expected IngestError")
    } catch (err) {
      expect(err).toBeInstanceOf(IngestError)
      expect((err as IngestError).type).toBe("unsupported_protocol")
    }
  })
})

describe("grpc listen", () => {
  test("http2 Export returns grpc-status 0 and stores", async () => {
    const listener = await listen({
      port: 0,
      hostname: "127.0.0.1",
      db: ctx.db,
      maxBytes: testConfig.otlpMaxBodyBytes,
    })
    const client = connect(`http://127.0.0.1:${listener.port}`)
    try {
      const proto = await traceExport()
      await new Promise<void>((resolve, reject) => {
        client.once("connect", () => resolve())
        client.once("error", reject)
      })
      const status = await new Promise<string>((resolve, reject) => {
        const req = client.request({
          ":method": "POST",
          ":path": GRPC_EXPORT_PATHS.traces,
          "content-type": "application/grpc",
          te: "trailers",
        })
        let grpcStatus = ""
        req.on("error", reject)
        req.on("data", () => {})
        req.on("response", (headers) => {
          const fromHeaders = headers["grpc-status"]
          if (fromHeaders != null) grpcStatus = String(fromHeaders)
        })
        req.on("trailers", (headers) => {
          const fromTrailers = headers["grpc-status"]
          if (fromTrailers != null) grpcStatus = String(fromTrailers)
        })
        req.on("end", () => resolve(grpcStatus))
        req.write(encodeFrame(proto))
        req.end()
      })
      expect(status).toBe("0")
      const detail = await ctx.app.request(`/api/traces/${TRACE_ID_HEX}`)
      expect(detail.status).toBe(200)
    } finally {
      client.close()
      await listener.close()
    }
  })
})
