import type { AttributeValueStrategy } from "../types"
import { plainStrategy } from "./plain"
import { sqlStrategy } from "./sql"
import { urlStrategy } from "./url"

/** First match wins — more specific strategies first; `plain` is always last. */
export const attributeValueStrategies: AttributeValueStrategy[] = [
  sqlStrategy,
  urlStrategy,
  plainStrategy,
]
