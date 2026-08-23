import type { IngestProviderName } from "../ingest-provider"
import { otlpOverlay, overlays } from "./providers"
import type { Overlay } from "./types"

export function resolveOverlay(provider: IngestProviderName): Overlay {
  return overlays.find((overlay) => overlay.id === provider) ?? otlpOverlay
}
