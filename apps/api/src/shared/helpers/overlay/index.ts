import type { Json } from "../attrs"
import type { IngestProviderName } from "../ingest-provider"
import { asAttrMap } from "./attrs"
import { resolveOverlay } from "./resolve"

export function overlayAttributes(
  ingestProvider: IngestProviderName | undefined,
  attributes: Json,
): Record<string, Json> {
  const attrs = asAttrMap(attributes)
  return resolveOverlay(ingestProvider ?? "otlp").apply(attrs)
}

export { asAttrMap } from "./attrs"
export type { Overlay, OverlayFn } from "./types"
