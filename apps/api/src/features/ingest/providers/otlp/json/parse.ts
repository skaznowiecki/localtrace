import type { LogRecord } from "../../../../logs/types/log"
import type { MetricDataPoint } from "../../../../metrics/types/metric"
import type { SpanRecord } from "../../../../traces/types/span"
import { IngestError } from "../../errors"
import { mapLogRequest } from "../mappers/logs"
import { mapMetricRequest } from "../mappers/metrics"
import { mapTraceRequest } from "../mappers/traces"

function parseJsonObject(body: Uint8Array): Record<string, unknown> {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(body)) as unknown
    if (!parsed || typeof parsed !== "object") {
      throw new IngestError("invalid_payload", "json decode failed: expected object")
    }
    return parsed as Record<string, unknown>
  } catch (err) {
    if (err instanceof IngestError) throw err
    const message = err instanceof Error ? err.message : String(err)
    throw new IngestError("invalid_payload", `json decode failed: ${message}`)
  }
}

export async function parseTraces(body: Uint8Array): Promise<SpanRecord[]> {
  return mapTraceRequest(parseJsonObject(body))
}

export async function parseLogs(body: Uint8Array): Promise<LogRecord[]> {
  return mapLogRequest(parseJsonObject(body))
}

export async function parseMetrics(body: Uint8Array): Promise<MetricDataPoint[]> {
  return mapMetricRequest(parseJsonObject(body))
}
