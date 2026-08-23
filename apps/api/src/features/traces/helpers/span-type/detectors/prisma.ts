import { readAttrHit } from "@shared/helpers"
import type { SpanClass, SpanTypeDetector } from "./types"

export const prismaDetector: SpanTypeDetector = {
  id: "prisma",
  match: (span): SpanClass | undefined => {
    if (
      span.name !== "prisma:client:operation" &&
      !span.name.startsWith("prisma:")
    ) {
      return undefined
    }
    const hit = readAttrHit(span.attributes, ["name"])
    return {
      type: "prisma",
      payloadPath: hit?.path,
    }
  },
}
