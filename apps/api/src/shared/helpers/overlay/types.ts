import type { Json } from "../attrs"
import type { IngestProviderName } from "../ingest-provider"

export type OverlayFn = (attrs: Record<string, Json>) => Record<string, Json>

export type Overlay = {
  id: IngestProviderName
  apply: OverlayFn
}
