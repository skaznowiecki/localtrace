import type { Overlay } from "../overlay-attrs"
import { asAttrMap, asString, copyIfMissing } from "../overlay-attrs"

const EXPRESS_OPS = [
  "middleware.express",
  "router.express",
  "request_handler.express",
] as const

export const sentryOverlay: Overlay = {
  id: "sentry",
  apply: (input) => {
    const attrs = asAttrMap(input)
    copyIfMissing(attrs, "http.method", "http.request.method")
    copyIfMissing(attrs, "http.url", "url.full")
    copyIfMissing(attrs, "http.status_code", "http.response.status_code")

    const op = asString(attrs["sentry.op"])?.toLowerCase() ?? ""
    const isExpress = EXPRESS_OPS.some(
      (prefix) => op === prefix || op.startsWith(`${prefix}.`),
    )
    if (isExpress && attrs["express.type"] == null) {
      attrs["express.type"] = op
    }
    if (op === "db" && attrs["db.system"] == null) {
      attrs["db.system"] = "other"
    }
    return attrs
  },
}
