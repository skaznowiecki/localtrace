import { peerHost, urlHit } from "../host"
import type { SpanClass, SpanTypeDetector } from "./types"

function isOpenRouterHost(host: string): boolean {
  const hostname = host.toLowerCase()
  return hostname === "openrouter.ai" || hostname.endsWith(".openrouter.ai")
}

export const openrouterDetector: SpanTypeDetector = {
  id: "openrouter",
  match: (span): SpanClass | undefined => {
    const host = peerHost(span.attributes)
    if (!host || !isOpenRouterHost(host)) return undefined
    return {
      type: "openrouter",
      payloadPath: urlHit(span.attributes)?.path,
    }
  },
}
