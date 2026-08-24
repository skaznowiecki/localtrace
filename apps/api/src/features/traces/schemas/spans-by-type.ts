import * as z from "zod"
import { traceId } from "@shared/helpers"
import { SPAN_EXTRACT_TYPES } from "../helpers/span-extract"

export const spanType = z.enum(SPAN_EXTRACT_TYPES)

export const input = z.object({
  trace_id: traceId.describe("32-char hex trace id"),
  type: spanType.describe(
    "Span kind to extract: sql, redis, mongo, prisma, http, express, s3, openrouter, trpc, error",
  ),
})
