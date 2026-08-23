import type { Json } from "../../attrs"
import type { Overlay } from "../types"
import { asAttrMap, asString, copyIfMissing } from "../attrs"

function copyStatement(attrs: Record<string, Json>, from: string): void {
  const value = asString(attrs[from])
  if (!value) return
  if (attrs["db.statement"] == null) attrs["db.statement"] = value
  if (attrs["db.query.text"] == null) attrs["db.query.text"] = value
}

export const datadogOverlay: Overlay = {
  id: "datadog",
  apply: (input) => {
    const attrs = asAttrMap(input)
    copyIfMissing(attrs, "http.method", "http.request.method")
    copyIfMissing(attrs, "http.url", "url.full")
    copyIfMissing(attrs, "http.status_code", "http.response.status_code")
    copyIfMissing(attrs, "db.type", "db.system")
    copyStatement(attrs, "db.statement")
    copyStatement(attrs, "sql.query")
    copyStatement(attrs, "redis.raw_command")
    return attrs
  },
}
