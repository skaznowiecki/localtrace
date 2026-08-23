import { decodeBody } from "../../shared/decode"
import { mediaType } from "../../shared/media-type"
import type { IngestProvider } from "../../types"
import { isJson, isLogsPath, jsonOk } from "../helpers/paths"
import { parse } from "./parse"

export const datadogLogsProvider: IngestProvider = {
  id: "datadog-logs",
  match: (ctx) => {
    if (!isLogsPath(ctx.path)) return false
    const type = mediaType(ctx.contentType)
    return type === "" || isJson(type) || type === "text/plain"
  },
  decode: decodeBody,
  parseTraces: async () => [],
  parseLogs: async (body) => parse(body),
  parseMetrics: async () => [],
  successResponse: () => jsonOk(),
}
