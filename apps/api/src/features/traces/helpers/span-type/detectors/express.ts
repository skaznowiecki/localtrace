import { readAttr, readAttrHit } from "@shared/helpers"
import type { SpanClass, SpanTypeDetector } from "./types"

const EXPRESS_OPS = [
  "middleware.express",
  "router.express",
  "request_handler.express",
] as const

export const expressDetector: SpanTypeDetector = {
  id: "express",
  match: (span): SpanClass | undefined => {
    const op = readAttr(span.attributes, ["sentry.op"])?.toLowerCase() ?? ""
    const isExpressOp = EXPRESS_OPS.some(
      (prefix) => op === prefix || op.startsWith(`${prefix}.`),
    )
    const hasExpressAttr =
      readAttr(span.attributes, ["express.type", "express.name"]) != null
    if (!isExpressOp && !hasExpressAttr) return undefined

    const hit = readAttrHit(span.attributes, ["express.name", "http.route"])
    return {
      type: "express",
      payloadPath: hit?.path,
    }
  },
}
