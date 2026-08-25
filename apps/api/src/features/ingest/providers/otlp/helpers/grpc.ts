import type { Context } from "hono"
import type { AppEnv } from "@/app-env"
import { log } from "@shared/helpers"
import { IngestError } from "../../errors"
import { mediaType } from "../../shared/media-type"

export const GRPC_EXPORT_PATHS = {
  traces: "/opentelemetry.proto.collector.trace.v1.TraceService/Export",
  logs: "/opentelemetry.proto.collector.logs.v1.LogsService/Export",
  metrics: "/opentelemetry.proto.collector.metrics.v1.MetricsService/Export",
} as const

const GRPC_PATH_SET = new Set<string>(Object.values(GRPC_EXPORT_PATHS))

const GRPC_MEDIA = new Set([
  "application/grpc",
  "application/grpc+proto",
  "application/grpc-web",
  "application/grpc-web+proto",
])

export type GrpcLook = {
  path: string
  contentType?: string
  upgrade?: string
  http2Settings?: string
}

export function normalizeGrpcPath(path: string): string {
  const raw = (path.split("?")[0] ?? "").trim()
  if (!raw) return "/"
  return raw.startsWith("/") ? raw : `/${raw}`
}

export function looksLikeGrpc(input: GrpcLook): boolean {
  if (GRPC_PATH_SET.has(normalizeGrpcPath(input.path))) return true
  if (GRPC_MEDIA.has(mediaType(input.contentType))) return true
  const upgrade = input.upgrade?.toLowerCase() ?? ""
  if (upgrade.includes("h2c")) return true
  if (input.http2Settings?.trim()) return true
  return false
}

export function grpcOnHttpHint(grpcPort: number, httpPort: number): string {
  if (grpcPort > 0) {
    return `OTLP gRPC belongs on port ${grpcPort}, not this HTTP endpoint. Use OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:${grpcPort} or set OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf and send to :${httpPort}.`
  }
  return `OTLP gRPC is not enabled. Set OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf and send to :${httpPort}.`
}

export function rejectGrpcHttpRequest(c: Context<AppEnv>): void {
  const config = c.get("config")
  if (
    !looksLikeGrpc({
      path: c.req.path,
      contentType: c.req.header("content-type"),
      upgrade: c.req.header("upgrade"),
      http2Settings: c.req.header("http2-settings"),
    })
  ) {
    return
  }
  const message = grpcOnHttpHint(config.grpcPort, config.apiPort)
  log.warn(message)
  throw new IngestError("unsupported_protocol", message)
}

export function signalForGrpcPath(
  path: string,
): keyof typeof GRPC_EXPORT_PATHS | undefined {
  const normalized = normalizeGrpcPath(path)
  for (const [signal, exportPath] of Object.entries(GRPC_EXPORT_PATHS) as [
    keyof typeof GRPC_EXPORT_PATHS,
    string,
  ][]) {
    if (normalized === exportPath) return signal
  }
  return undefined
}
