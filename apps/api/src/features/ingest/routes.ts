import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import type { AppEnv } from "../../app-env"
import { IngestError } from "./providers/errors"
import * as ingest from "./services/ingest"
import * as resolve from "./services/resolve"

export function routes(maxBytes: number): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.use(
    bodyLimit({
      maxSize: maxBytes,
      onError: () => {
        throw new IngestError("payload_too_large")
      },
    }),
  )

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
