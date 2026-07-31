import type { SpanNameStrategy } from "../types"
import { httpStrategy } from "./http"
import { plainStrategy } from "./plain"

/** First match wins. */
export const spanNameStrategies: SpanNameStrategy[] = [
  httpStrategy,
  plainStrategy,
]
