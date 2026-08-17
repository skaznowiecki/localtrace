import type { Context } from "hono"
import { Hono } from "hono"
import type { AppEnv } from "../../../app-env"
import { OtlpError } from "../types/otlp"
import {
  decodeBody,
  parseContentEncoding,
  parseContentType,
} from "../providers/otlp/decode"
import * as ingest from "../services/ingest"
import { otlpError, statusForOtlp, withIngestGate } from "./handler"

export function ingestRoutes(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()
  app.post("/v1/traces", (c) => exportSignal(c, "traces"))
  app.post("/v1/logs", (c) => exportSignal(c, "logs"))
  app.post("/v1/metrics", (c) => exportSignal(c, "metrics"))
  return app
}

async function exportSignal(
  c: Context<AppEnv>,
  signal: "traces" | "logs" | "metrics",
) {
  let format: "json" | "protobuf" = "json"
  try {
    format = parseContentType(c.req.header("content-type"))
  } catch (err) {
    const e =
      err instanceof OtlpError
        ? err
        : new OtlpError(String(err), "unsupported_media_type")
    return otlpError("json", statusForOtlp(e), e)
  }

  let gzip = false
  try {
    gzip = parseContentEncoding(c.req.header("content-encoding"))
  } catch (err) {
    const e =
      err instanceof OtlpError
        ? err
        : new OtlpError(String(err), "unsupported_content_encoding")
    return otlpError(format, statusForOtlp(e), e)
  }

  const maxBytes = c.get("config").otlpMaxBodyBytes
  const raw = new Uint8Array(await c.req.arrayBuffer())

  return withIngestGate(c, format, async () => {
    const decoded = decodeBody(raw, gzip, maxBytes)
    const db = c.get("db")
    let count = 0
    if (signal === "traces") count = await ingest.ingestTraces(db, decoded, format)
    else if (signal === "logs") count = await ingest.ingestLogs(db, decoded, format)
    else count = await ingest.ingestMetrics(db, decoded, format)
    console.info(
      `otlp ingest batch signal=${signal} format=${format} gzip=${gzip} count=${count}`,
    )
  })
}
