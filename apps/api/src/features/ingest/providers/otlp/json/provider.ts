import { decodeBody } from "../../shared/decode"
import { mediaType } from "../../shared/media-type"
import type { IngestProvider } from "../../types"
import { OTLP_PATHS } from "../helpers/paths"
import { otlpJsonSuccess } from "./handler"
import { parseLogs, parseMetrics, parseTraces } from "./parse"

export const otlpJsonProvider: IngestProvider = {
  id: "otlp-json",
  match: (ctx) =>
    OTLP_PATHS.has(ctx.path) && mediaType(ctx.contentType) === "application/json",
  decode: decodeBody,
  parseTraces,
  parseLogs,
  parseMetrics,
  successResponse: otlpJsonSuccess,
}
