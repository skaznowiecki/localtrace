import { decodeBody } from "../../shared/decode"
import { mediaType } from "../../shared/media-type"
import type { IngestProvider, IngestRequestContext } from "../../types"
import { TRACE_MSGPACK_PATHS, isMsgpack, tracesSuccess } from "../helpers/paths"
import { parse as parseV04 } from "./v04/parse"
import { parse as parseV05 } from "./v05/parse"
import { parse as parseV07 } from "./v07/parse"

export const datadogMsgpackProvider: IngestProvider = {
  id: "datadog-msgpack",
  match: (ctx) =>
    TRACE_MSGPACK_PATHS.has(ctx.path) && isMsgpack(mediaType(ctx.contentType)),
  decode: decodeBody,
  parseTraces: async (body, ctx) => parseByPath(body, ctx),
  parseLogs: async () => [],
  parseMetrics: async () => [],
  successResponse: () => tracesSuccess("/v0.4/traces"),
}

function parseByPath(body: Uint8Array, ctx?: IngestRequestContext) {
  const path = ctx?.path ?? ""
  if (path.includes("/v0.5/")) return parseV05(body)
  if (path.includes("/v0.7/")) return parseV07(body)
  return parseV04(body)
}
