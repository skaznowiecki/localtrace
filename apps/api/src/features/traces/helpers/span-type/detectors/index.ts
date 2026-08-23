import type { SpanTypeDetector } from "./types"
import { expressDetector } from "./express"
import { httpDetector } from "./http"
import { mongoDetector } from "./mongo"
import { openrouterDetector } from "./openrouter"
import { prismaDetector } from "./prisma"
import { redisDetector } from "./redis"
import { s3Detector } from "./s3"
import { sqlDetector } from "./sql"

/** First match wins — more specific detectors first. */
export const spanTypeDetectors: SpanTypeDetector[] = [
  redisDetector,
  mongoDetector,
  sqlDetector,
  prismaDetector,
  s3Detector,
  openrouterDetector,
  expressDetector,
  httpDetector,
]
