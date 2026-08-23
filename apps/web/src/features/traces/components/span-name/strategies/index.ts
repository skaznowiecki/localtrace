import type { SpanNameStrategy } from "../types"
import { httpStrategy } from "./http"
import { plainStrategy } from "./plain"
import { prismaStrategy } from "./prisma"
import { sqlStrategy } from "./sql"

/** First match wins. */
export const spanNameStrategies: SpanNameStrategy[] = [
  prismaStrategy,
  sqlStrategy,
  httpStrategy,
  plainStrategy,
]
