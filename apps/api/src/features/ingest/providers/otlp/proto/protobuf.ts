import { join } from "node:path"
import protobuf from "protobufjs"
import { IngestError } from "../../errors"

const PROTO_ROOT = join(import.meta.dir, "../../../../../../proto")

let rootPromise: Promise<protobuf.Root> | undefined

async function loadRoot(): Promise<protobuf.Root> {
  if (!rootPromise) {
    const root = new protobuf.Root()
    root.resolvePath = (_origin, target) => {
      if (target.startsWith("/")) return target
      return join(PROTO_ROOT, target)
    }
    rootPromise = root.load([
      "opentelemetry/proto/collector/trace/v1/trace_service.proto",
      "opentelemetry/proto/collector/logs/v1/logs_service.proto",
      "opentelemetry/proto/collector/metrics/v1/metrics_service.proto",
    ])
  }
  return rootPromise
}

export async function decodeProtobuf(
  body: Uint8Array,
  typeName: string,
): Promise<Record<string, unknown>> {
  try {
    const root = await loadRoot()
    const type = root.lookupType(typeName)
    const message = type.decode(body)
    return type.toObject(message, {
      longs: String,
      enums: Number,
      bytes: Buffer,
      defaults: false,
      arrays: true,
      objects: true,
      oneofs: true,
    }) as Record<string, unknown>
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new IngestError("invalid_payload", `protobuf decode failed: ${message}`)
  }
}
