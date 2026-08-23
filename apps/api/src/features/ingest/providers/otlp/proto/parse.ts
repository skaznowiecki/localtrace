import type { LogRecord } from "@features/logs/types/log"
import type { MetricDataPoint } from "@features/metrics/types/metric"
import type { SpanRecord } from "@features/traces/types/span"
import { mapLogRequest } from "../mappers/logs"
import { mapMetricRequest } from "../mappers/metrics"
import { mapTraceRequest } from "../mappers/traces"
import { decodeProtobuf } from "./protobuf"

export async function parseTraces(body: Uint8Array): Promise<SpanRecord[]> {
  const request = await decodeProtobuf(
    body,
    "opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest",
  )
  return mapTraceRequest(request)
}

export async function parseLogs(body: Uint8Array): Promise<LogRecord[]> {
  const request = await decodeProtobuf(
    body,
    "opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest",
  )
  return mapLogRequest(request)
}

export async function parseMetrics(body: Uint8Array): Promise<MetricDataPoint[]> {
  const request = await decodeProtobuf(
    body,
    "opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest",
  )
  return mapMetricRequest(request)
}
