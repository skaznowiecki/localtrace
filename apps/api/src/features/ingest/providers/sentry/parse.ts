import type { LogRecord } from "@features/logs/types/log"
import type { MetricDataPoint } from "@features/metrics/types/metric"
import type { SpanRecord } from "@features/traces/types/span"
import { log } from "@shared/helpers"
import type { IngestBatch } from "../types"
import { parseEnvelope, parseItemJson } from "./envelope"
import { asString } from "./helpers/values"
import { mapEvent, mapLogItems } from "./mappers/logs"
import { mapSpanItems, mapTransaction } from "./mappers/traces"

function skipReason(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export async function parseBatch(body: Uint8Array): Promise<IngestBatch> {
  const envelope = parseEnvelope(body)
  const spans: SpanRecord[] = []
  const logs: LogRecord[] = []

  for (const item of envelope.items) {
    try {
      if (item.type === "transaction") {
        spans.push(...mapTransaction(parseItemJson(item)))
        continue
      }
      if (item.type === "span") {
        spans.push(...mapSpanItems(parseItemJson(item), envelope.header))
        continue
      }
      if (item.type === "event") {
        logs.push(mapEvent(parseItemJson(item)))
        continue
      }
      if (item.type === "log") {
        logs.push(...mapLogItems(parseItemJson(item), envelope.header))
      }
    } catch (err) {
      log.warn(`sentry skip item type=${item.type}: ${skipReason(err)}`)
    }
  }

  const eventId = asString(envelope.header.event_id)?.replace(/-/g, "")
  return {
    eventId,
    spans,
    logs,
    metrics: [],
  }
}

export async function parseTraces(body: Uint8Array): Promise<SpanRecord[]> {
  return (await parseBatch(body)).spans
}

export async function parseLogs(body: Uint8Array): Promise<LogRecord[]> {
  return (await parseBatch(body)).logs
}

export async function parseMetrics(): Promise<MetricDataPoint[]> {
  return []
}
