import { decodeBody } from "../../shared/decode"
import { mediaType } from "../../shared/media-type"
import type { IngestProvider } from "../../types"
import { TRACE_JSON_PATHS, isJson, jsonOk } from "../helpers/paths"
import { parse } from "./parse"

export const datadogJsonProvider: IngestProvider = {
  id: "datadog-json",
  match: (ctx) =>
    TRACE_JSON_PATHS.has(ctx.path) && isJson(mediaType(ctx.contentType)),
  decode: decodeBody,
  parseTraces: async (body) => parse(body),
  parseLogs: async () => [],
  parseMetrics: async () => [],
  successResponse: () => jsonOk(),
}
