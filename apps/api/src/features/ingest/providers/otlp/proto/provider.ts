import { decodeBody } from "../../shared/decode"
import { mediaType } from "../../shared/media-type"
import type { IngestProvider } from "../../types"
import { OTLP_PATHS } from "../helpers/paths"
import { otlpProtoSuccess } from "./handler"
import { parseLogs, parseMetrics, parseTraces } from "./parse"

const PROTO_MEDIA = new Set(["application/x-protobuf", "application/protobuf"])

export const otlpProtoProvider: IngestProvider = {
  id: "otlp-proto",
  match: (ctx) =>
    OTLP_PATHS.has(ctx.path) && PROTO_MEDIA.has(mediaType(ctx.contentType)),
  decode: decodeBody,
  parseTraces,
  parseLogs,
  parseMetrics,
  successResponse: otlpProtoSuccess,
}
