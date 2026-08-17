import type { Db } from "../../../db/client"
import type { PayloadFormat } from "../types/otlp"
import { persistSpans } from "../../traces"
import { persistLogs } from "../../logs"
import { persistMetrics } from "../../metrics"
import { parseLogs, parseMetrics, parseTraces } from "../providers/otlp"

export async function ingestTraces(
  db: Db,
  body: Uint8Array,
  format: PayloadFormat,
): Promise<number> {
  const spans = await parseTraces(body, format)
  await persistSpans(db, spans)
  return spans.length
}

export async function ingestLogs(
  db: Db,
  body: Uint8Array,
  format: PayloadFormat,
): Promise<number> {
  const logs = await parseLogs(body, format)
  await persistLogs(db, logs)
  return logs.length
}

export async function ingestMetrics(
  db: Db,
  body: Uint8Array,
  format: PayloadFormat,
): Promise<number> {
  const points = await parseMetrics(body, format)
  await persistMetrics(db, points)
  return points.length
}
