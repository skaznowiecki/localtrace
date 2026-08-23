import { readAttrHit } from "@shared/helpers"
import { URL_KEYS, urlHit } from "../host"
import type { SpanClass, SpanTypeDetector } from "./types"

const HTTP_KEYS = [
  "http.request.method",
  "http.method",
  ...URL_KEYS,
  "http.route",
  "http.target",
  "url.path",
] as const

export const httpDetector: SpanTypeDetector = {
  id: "http",
  match: (span): SpanClass | undefined => {
    const hit = readAttrHit(span.attributes, [...HTTP_KEYS])
    if (!hit) return undefined
    return {
      type: "http",
      payloadPath: urlHit(span.attributes)?.path ?? hit.path,
    }
  },
}
