import type { TraceNameStrategy } from "../types"
import { plainStrategy } from "./plain"
import { resourceStrategy } from "./resource"

export const traceNameStrategies: TraceNameStrategy[] = [
  resourceStrategy,
  plainStrategy,
]
