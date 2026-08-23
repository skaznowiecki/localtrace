import { readAttr, readAttrHit } from "@shared/helpers"
import type { SpanClass, SpanTypeDetector } from "./types"

export const expressDetector: SpanTypeDetector = {
  id: "express",
  match: (span): SpanClass | undefined => {
    const hasExpressAttr =
      readAttr(span.attributes, ["express.type", "express.name"]) != null
    if (!hasExpressAttr) return undefined

    const hit = readAttrHit(span.attributes, ["express.name", "http.route"])
    return {
      type: "express",
      payloadPath: hit?.path,
    }
  },
}
