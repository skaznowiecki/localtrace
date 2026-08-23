import type { SpanOverviewStrategy } from "../types"
import { expressOverviewStrategy } from "./express"
import { httpOverviewStrategy } from "./http"
import { mongoOverviewStrategy } from "./mongo"
import { openrouterOverviewStrategy } from "./openrouter"
import { prismaOverviewStrategy } from "./prisma"
import { redisOverviewStrategy } from "./redis"
import { s3OverviewStrategy } from "./s3"
import { sqlOverviewStrategy } from "./sql"

/** First match wins — more specific strategies first. */
export const spanOverviewStrategies: SpanOverviewStrategy[] = [
  prismaOverviewStrategy,
  redisOverviewStrategy,
  mongoOverviewStrategy,
  sqlOverviewStrategy,
  s3OverviewStrategy,
  openrouterOverviewStrategy,
  expressOverviewStrategy,
  httpOverviewStrategy,
]
