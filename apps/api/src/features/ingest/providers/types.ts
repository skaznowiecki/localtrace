import type { LogRecord } from "@features/logs/types/log"
import type { MetricDataPoint } from "@features/metrics/types/metric"
import type { SpanRecord } from "@features/traces/types/span"

export type IngestRequestContext = {
  path: string
  contentType?: string
  contentEncoding?: string
  maxBytes: number
}

export type IngestBatch = {
  eventId?: string
  spans: SpanRecord[]
  logs: LogRecord[]
  metrics: MetricDataPoint[]
}

type IngestProviderBase = {
  id: string
  parseTraces: (
    body: Uint8Array,
    ctx?: IngestRequestContext,
  ) => Promise<SpanRecord[]>
  parseLogs: (
    body: Uint8Array,
    ctx?: IngestRequestContext,
  ) => Promise<LogRecord[]>
  parseMetrics: (
    body: Uint8Array,
    ctx?: IngestRequestContext,
  ) => Promise<MetricDataPoint[]>
  parseBatch?: (
    body: Uint8Array,
    ctx?: IngestRequestContext,
  ) => Promise<IngestBatch>
  successResponse: (eventId?: string) => Response
}

export type IngestProvider = IngestProviderBase & {
  match: (ctx: IngestRequestContext) => boolean
  decode: (body: Uint8Array, ctx: IngestRequestContext) => Uint8Array
}

export type ResolvedIngestProvider = IngestProviderBase & {
  decode: (body: Uint8Array) => Uint8Array
}
