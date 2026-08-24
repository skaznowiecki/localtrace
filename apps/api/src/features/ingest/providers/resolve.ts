import { datadogJsonProvider } from "./datadog/json"
import { datadogLogsProvider } from "./datadog/logs"
import { datadogMetricsProvider } from "./datadog/metrics"
import { datadogMsgpackProvider } from "./datadog/msgpack"
import { otlpJsonProvider } from "./otlp/json"
import { otlpProtoProvider } from "./otlp/proto"
import { sentryProvider } from "./sentry"
import type { IngestProvider, IngestRequestContext } from "./types"

/**
 * Ingest request strategies — first match wins.
 *
 * Add a provider: implement `IngestProvider` under `providers/<name>/`,
 * register it here (more specific first), and add `providers/<name>/overlay.ts`
 * (vendor attrs → OTEL) to the overlay registry.
 */
export const ingestProviders: IngestProvider[] = [
  datadogMsgpackProvider,
  datadogJsonProvider,
  datadogLogsProvider,
  datadogMetricsProvider,
  sentryProvider,
  otlpProtoProvider,
  otlpJsonProvider,
]

export function resolveIngestProvider(
  ctx: IngestRequestContext,
): IngestProvider | null {
  return ingestProviders.find((provider) => provider.match(ctx)) ?? null
}
