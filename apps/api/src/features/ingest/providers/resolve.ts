import { otlpJsonProvider } from "./otlp/json"
import { otlpProtoProvider } from "./otlp/proto"
import { sentryProvider } from "./sentry"
import type { IngestProvider, IngestRequestContext } from "./types"

/**
 * Ingest request strategies — first match wins.
 *
 * Add a provider: implement `IngestProvider` under `providers/<name>/`,
 * then register it here (more specific first).
 */
export const ingestProviders: IngestProvider[] = [
  sentryProvider,
  otlpProtoProvider,
  otlpJsonProvider,
]

export function resolveIngestProvider(
  ctx: IngestRequestContext,
): IngestProvider | null {
  return ingestProviders.find((provider) => provider.match(ctx)) ?? null
}
