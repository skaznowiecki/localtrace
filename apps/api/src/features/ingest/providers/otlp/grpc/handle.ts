import type { Db } from "@shared/db"
import { log, stampIngestProvider } from "@shared/helpers"
import { store as storeTraces } from "@features/traces"
import { store as storeLogs } from "@features/logs"
import { store as storeMetrics } from "@features/metrics"
import { IngestError } from "../../errors"
import { signalForGrpcPath } from "../helpers/grpc"
import { parseLogs, parseMetrics, parseTraces } from "../proto/parse"
import { decodeFrames } from "./frame"

export type GrpcExportInput = {
  db: Db
  path: string
  body: Uint8Array
  encoding?: string
  maxBytes: number
}

function gunzip(body: Uint8Array): Uint8Array {
  try {
    return Bun.gunzipSync(body as unknown as ArrayBuffer)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new IngestError("invalid_payload", `gzip decode failed: ${message}`)
  }
}

function payloadFromFrames(
  body: Uint8Array,
  maxBytes: number,
): Uint8Array {
  if (body.byteLength > maxBytes) {
    throw new IngestError("payload_too_large")
  }
  const frames = decodeFrames(body)
  if (frames.length !== 1) {
    throw new IngestError(
      "invalid_payload",
      `expected 1 grpc message, got ${frames.length}`,
    )
  }
  const frame = frames[0]
  if (!frame) {
    throw new IngestError("invalid_payload", "expected 1 grpc message, got 0")
  }
  const payload = frame.compressed ? gunzip(frame.payload) : frame.payload
  if (payload.byteLength > maxBytes) {
    throw new IngestError("payload_too_large")
  }
  return payload
}

export async function execute(input: GrpcExportInput): Promise<void> {
  const signal = signalForGrpcPath(input.path)
  if (!signal) {
    throw new IngestError(
      "unsupported_protocol",
      `unknown grpc method: ${input.path}`,
    )
  }

  const encoding = input.encoding?.trim().toLowerCase() ?? ""
  if (
    encoding &&
    encoding !== "identity" &&
    encoding !== "gzip"
  ) {
    throw new IngestError(
      "unsupported_content_encoding",
      `unsupported grpc encoding: ${input.encoding}`,
    )
  }

  const payload = payloadFromFrames(input.body, input.maxBytes)
  await dispatch(input.db, signal, payload)
}

async function dispatch(
  db: Db,
  signal: NonNullable<ReturnType<typeof signalForGrpcPath>>,
  payload: Uint8Array,
): Promise<void> {
  if (signal === "traces") {
    const spans = stampIngestProvider(await parseTraces(payload), "otlp-grpc")
    await storeTraces(db, spans)
    log(`ingest batch provider=otlp-grpc signal=traces count=${spans.length}`)
    return
  }
  if (signal === "logs") {
    const records = stampIngestProvider(await parseLogs(payload), "otlp-grpc")
    await storeLogs(db, records)
    log(`ingest batch provider=otlp-grpc signal=logs count=${records.length}`)
    return
  }
  const points = stampIngestProvider(await parseMetrics(payload), "otlp-grpc")
  await storeMetrics(db, points)
  log(`ingest batch provider=otlp-grpc signal=metrics count=${points.length}`)
}
