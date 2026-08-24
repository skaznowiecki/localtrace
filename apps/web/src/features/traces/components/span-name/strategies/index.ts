import type { SpanNameStrategy } from "../types"
import { httpStrategy } from "./http"
import { plainStrategy } from "./plain"
import { prismaStrategy } from "./prisma"
import { sqlStrategy } from "./sql"
import { trpcStrategy } from "./trpc"

/** First match wins. */
export const spanNameStrategies: SpanNameStrategy[] = [
  prismaStrategy,
  trpcStrategy,
  sqlStrategy,
  httpStrategy,
  plainStrategy,
]
