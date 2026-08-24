import type { IngestProviderName, Json } from "@shared/helpers"
import { datadogOverlay } from "./datadog/overlay"
import { asAttrMap, type Overlay } from "./overlay-attrs"
import { otlpOverlay } from "./otlp/overlay"
import { sentryOverlay } from "./sentry/overlay"

/**
 * Vendor attr rewrites — first match by family id.
 *
 * Add an overlay: `providers/<name>/overlay.ts`, then register it here.
 */
const overlays: Overlay[] = [otlpOverlay, sentryOverlay, datadogOverlay]

export function overlayAttributes(
  ingestProvider: IngestProviderName | undefined,
  attributes: Json,
): Record<string, Json> {
  const attrs = asAttrMap(attributes)
  const overlay =
    overlays.find((item) => item.id === (ingestProvider ?? "otlp")) ??
    otlpOverlay
  return overlay.apply(attrs)
}
