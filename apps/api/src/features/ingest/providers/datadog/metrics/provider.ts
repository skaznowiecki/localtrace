import { decodeBody } from "../../shared/decode"
import { mediaType } from "../../shared/media-type"
import type { IngestProvider, IngestRequestContext } from "../../types"
import { isJson, isMetricsPath, jsonOk } from "../helpers/paths"
import { parse } from "./parse"

export const datadogMetricsProvider: IngestProvider = {
  id: "datadog-metrics",
  match: (ctx) => isMetricsPath(ctx.path) && isJson(mediaType(ctx.contentType)),
  decode: decodeBody,
  parseTraces: async () => [],
  parseLogs: async () => [],
  parseMetrics: async (body, ctx) => parse(body, versionOf(ctx)),
  successResponse: () => jsonOk(),
}

function versionOf(ctx?: IngestRequestContext): 1 | 2 {
  return ctx?.path.includes("/v2/") ? 2 : 1
}
