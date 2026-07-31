import type { SpanOverviewStrategy } from "../types"
import { httpOverviewStrategy } from "./http"

/** First match wins — more specific strategies first. */
export const spanOverviewStrategies: SpanOverviewStrategy[] = [
  httpOverviewStrategy,
]
