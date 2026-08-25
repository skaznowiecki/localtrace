import type { Context } from "hono"
import type { AppEnv } from "@/app-env"
import { IngestError } from "../providers/errors"
import { rejectGrpcHttpRequest } from "../providers/otlp/helpers/grpc"
import type {
  IngestRequestContext,
  ResolvedIngestProvider,
} from "../providers/types"
import { resolveIngestProvider } from "../providers/resolve"

export function execute(c: Context<AppEnv>): ResolvedIngestProvider {
  rejectGrpcHttpRequest(c)

  const ctx: IngestRequestContext = {
    path: c.req.path,
    contentType: c.req.header("content-type"),
    contentEncoding: c.req.header("content-encoding"),
    maxBytes: c.get("config").otlpMaxBodyBytes,
  }

  const provider = resolveIngestProvider(ctx)
  if (!provider) {
    throw new IngestError(
      "unsupported_media_type",
      `unsupported media type: ${ctx.contentType ?? "missing"}`,
    )
  }

  return {
    ...provider,
    decode: (body) => provider.decode(body, ctx),
    parseTraces: (body) => provider.parseTraces(body, ctx),
    parseLogs: (body) => provider.parseLogs(body, ctx),
    parseMetrics: (body) => provider.parseMetrics(body, ctx),
    parseBatch: provider.parseBatch
      ? (body) => provider.parseBatch!(body, ctx)
      : undefined,
  }
}
