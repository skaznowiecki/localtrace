import type { LogRecord } from "../../logs/types/log"
import type { MetricDataPoint } from "../../metrics/types/metric"
import type { SpanRecord } from "../../traces/types/span"

export type IngestRequestContext = {
  path: string
  contentType?: string
  contentEncoding?: string
  maxBytes: number
}

type IngestProviderBase = {
  id: string
  parseTraces: (body: Uint8Array) => Promise<SpanRecord[]>
  parseLogs: (body: Uint8Array) => Promise<LogRecord[]>
  parseMetrics: (body: Uint8Array) => Promise<MetricDataPoint[]>
  successResponse: () => Response
}

export type IngestProvider = IngestProviderBase & {
  match: (ctx: IngestRequestContext) => boolean
  decode: (body: Uint8Array, ctx: IngestRequestContext) => Uint8Array
}

export type ResolvedIngestProvider = IngestProviderBase & {
  decode: (body: Uint8Array) => Uint8Array
}
