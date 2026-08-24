import { readAttr, readAttrHit } from "@shared/helpers"
import type { SpanClass, SpanTypeDetector } from "./types"

const SYSTEM_KEYS = ["rpc.system.name", "rpc.system"] as const

function isTrpcSystem(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "trpc"
}

export const trpcDetector: SpanTypeDetector = {
  id: "trpc",
  match: (span): SpanClass | undefined => {
    const system = readAttr(span.attributes, [...SYSTEM_KEYS])
    const trpcPath = readAttrHit(span.attributes, ["trpc.path"])
    const byName = span.name === "trpc.procedure"
    if (!isTrpcSystem(system) && !trpcPath && !byName) return undefined

    const pathHit = trpcPath ?? readAttrHit(span.attributes, ["rpc.method"])
    return {
      type: "trpc",
      payloadPath: pathHit?.path,
    }
  },
}
