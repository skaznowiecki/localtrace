import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import type { AppEnv } from "@/app-env"
import { IngestError } from "./providers/errors"
import * as envelopeIngest from "./services/envelope"
import * as ingest from "./services/ingest"
import * as resolve from "./services/resolve"

function limited(maxBytes: number): Hono<AppEnv> {
  const app = new Hono<AppEnv>()
  app.use(
    bodyLimit({
      maxSize: maxBytes,
      onError: () => {
        throw new IngestError("payload_too_large")
      },
    }),
  )
  return app
}

export function routes(maxBytes: number): Hono<AppEnv> {
  const app = limited(maxBytes)

  const ingestLogs = async (c: Parameters<typeof ingest.ingestLogs>[0]) => {
    const provider = resolve.execute(c)
    await ingest.ingestLogs(c, provider)
    return provider.successResponse()
  }
  app.post("/input", ingestLogs)
  app.post("/input/:apiKey", ingestLogs)

  app.post("/traces", async (c) => {
    const provider = resolve.execute(c)
    await ingest.ingestTraces(c, provider)
    return provider.successResponse()
  })

  app.post("/logs", async (c) => {
    const provider = resolve.execute(c)
    await ingest.ingestLogs(c, provider)
    return provider.successResponse()
  })

  app.post("/metrics", async (c) => {
    const provider = resolve.execute(c)
    await ingest.ingestMetrics(c, provider)
    return provider.successResponse()
  })

  return app
}

export function envelope(maxBytes: number): Hono<AppEnv> {
  const app = limited(maxBytes)

  app.post("/v2/logs", async (c) => {
    const provider = resolve.execute(c)
    await ingest.ingestLogs(c, provider)
    return provider.successResponse()
  })
  app.post("/v1/series", async (c) => {
    const provider = resolve.execute(c)
    await ingest.ingestMetrics(c, provider)
    return provider.successResponse()
  })
  app.post("/v2/series", async (c) => {
    const provider = resolve.execute(c)
    await ingest.ingestMetrics(c, provider)
    return provider.successResponse()
  })

  // SDKs POST with a trailing slash (`/api/<id>/envelope/`).
  app.post("/:projectId/envelope", async (c) => {
    const provider = resolve.execute(c)
    const eventId = await envelopeIngest.execute(c, provider)
    return provider.successResponse(eventId)
  })
  app.post("/:projectId/envelope/", async (c) => {
    const provider = resolve.execute(c)
    const eventId = await envelopeIngest.execute(c, provider)
    return provider.successResponse(eventId)
  })

  return app
}
