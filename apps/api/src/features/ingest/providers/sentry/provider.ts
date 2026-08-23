import { decodeBody } from "../shared/decode"
import type { IngestProvider } from "../types"
import { sentrySuccess } from "./handler"
import { isEnvelopePath } from "./helpers/paths"
import { parseBatch, parseLogs, parseMetrics, parseTraces } from "./parse"

export const sentryProvider: IngestProvider = {
  id: "sentry",
  match: (ctx) => isEnvelopePath(ctx.path),
  decode: decodeBody,
  parseTraces,
  parseLogs,
  parseMetrics,
  parseBatch,
  successResponse: sentrySuccess,
}
