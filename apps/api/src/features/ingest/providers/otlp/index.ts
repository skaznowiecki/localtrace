import { OtlpError, type PayloadFormat } from "../../types/otlp"
import { decodeProtobuf } from "./protobuf"
import { mapTraceRequest } from "./mappers/traces"
import { mapLogRequest } from "./mappers/logs"
import { mapMetricRequest } from "./mappers/metrics"
import type { SpanRecord } from "../../../traces/types/span"
import type { LogRecord } from "../../../logs/types/log"
import type { MetricDataPoint } from "../../../metrics/types/metric"

function parseJsonObject(body: Uint8Array): Record<string, unknown> {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(body)) as unknown
    if (!parsed || typeof parsed !== "object") {
      throw new OtlpError("json decode failed: expected object", "invalid_payload")
    }
    return parsed as Record<string, unknown>
  } catch (err) {
    if (err instanceof OtlpError) throw err
    const message = err instanceof Error ? err.message : String(err)
    throw new OtlpError(`json decode failed: ${message}`, "invalid_payload")
  }
}

export async function parseTraces(
  body: Uint8Array,
  format: PayloadFormat,
): Promise<SpanRecord[]> {
  const request =
    format === "json"
      ? parseJsonObject(body)
      : await decodeProtobuf(
          body,
          "opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest",
        )
  return mapTraceRequest(request)
}

export async function parseLogs(
  body: Uint8Array,
  format: PayloadFormat,
): Promise<LogRecord[]> {
  const request =
    format === "json"
      ? parseJsonObject(body)
      : await decodeProtobuf(
          body,
          "opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest",
        )
  return mapLogRequest(request)
}

export async function parseMetrics(
  body: Uint8Array,
  format: PayloadFormat,
): Promise<MetricDataPoint[]> {
  const request =
    format === "json"
      ? parseJsonObject(body)
      : await decodeProtobuf(
          body,
          "opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest",
        )
  return mapMetricRequest(request)
}
