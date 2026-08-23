import { peerHost, urlHit } from "../host"
import type { SpanClass, SpanTypeDetector } from "./types"

/** S3 regional / virtual-hosted style hosts. */
export const S3_HOST = /(?:^|\.)s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i

export const s3Detector: SpanTypeDetector = {
  id: "s3",
  match: (span): SpanClass | undefined => {
    const host = peerHost(span.attributes)
    if (!host || !S3_HOST.test(host)) return undefined
    return {
      type: "s3",
      payloadPath: urlHit(span.attributes)?.path,
    }
  },
}
