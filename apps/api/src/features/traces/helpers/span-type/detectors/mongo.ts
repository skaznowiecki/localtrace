import { readAttrHit } from "@shared/helpers"
import { dbSystem, STATEMENT_KEYS } from "./sql"
import type { SpanClass, SpanTypeDetector } from "./types"

export const MONGO_SYSTEMS = new Set(["mongodb", "mongo"])

export const mongoDetector: SpanTypeDetector = {
  id: "mongo",
  match: (span): SpanClass | undefined => {
    const system = dbSystem(span.attributes)
    if (!system || !MONGO_SYSTEMS.has(system)) return undefined
    const hit = readAttrHit(span.attributes, [...STATEMENT_KEYS])
    return {
      type: "mongo",
      payloadPath: hit?.path,
    }
  },
}
