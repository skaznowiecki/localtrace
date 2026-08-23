import { readAttrHit } from "@shared/helpers"
import { dbSystem, STATEMENT_KEYS } from "./sql"
import type { SpanClass, SpanTypeDetector } from "./types"

export const REDIS_SYSTEMS = new Set(["redis", "valkey", "memcached"])

export const redisDetector: SpanTypeDetector = {
  id: "redis",
  match: (span): SpanClass | undefined => {
    const system = dbSystem(span.attributes)
    if (!system || !REDIS_SYSTEMS.has(system)) return undefined
    const hit = readAttrHit(span.attributes, [...STATEMENT_KEYS])
    return {
      type: "redis",
      payloadPath: hit?.path,
    }
  },
}
