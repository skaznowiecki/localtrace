import type { Context, Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import type { AppEnv } from "@/app-env"
import { IngestError } from "../errors"
import * as ingest from "../../services/ingest"
import * as resolve from "../../services/resolve"
import { tracesSuccess } from "./helpers/paths"
import { info } from "./info"
import { mountStubs } from "./stubs"

export function mountAgent(app: Hono<AppEnv>, maxBytes: number): void {
  app.get("/info", (c) => c.json(info(c.get("config").otlpMaxBodyBytes)))

  const limit = bodyLimit({
    maxSize: maxBytes,
    onError: () => {
      throw new IngestError("payload_too_large")
    },
  })

  const traces = async (c: Context<AppEnv>) => {
    const provider = resolve.execute(c)
    await ingest.ingestTraces(c, provider)
    return tracesSuccess(c.req.path)
  }

  for (const path of [
    "/v0.3/traces",
    "/v0.4/traces",
    "/v0.5/traces",
    "/v0.7/traces",
  ]) {
    app.on(["PUT", "POST"], path, limit, traces)
  }

  mountStubs(app)
}
