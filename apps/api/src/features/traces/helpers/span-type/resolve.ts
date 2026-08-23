import { spanTypeDetectors } from "./detectors"
import type { SpanClass, SpanTypeInput } from "./types"

export function classify(span: SpanTypeInput): SpanClass | undefined {
  for (const detector of spanTypeDetectors) {
    const result = detector.match(span)
    if (result) return result
  }
  return undefined
}
