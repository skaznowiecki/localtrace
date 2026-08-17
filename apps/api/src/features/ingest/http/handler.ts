import type { Context } from "hono"
import protobuf from "protobufjs"
import type { AppEnv } from "../../../app-env"
import { OtlpError, type PayloadFormat } from "../types/otlp"
import { contentTypeFor } from "../providers/otlp/decode"

const RpcStatus = protobuf.parse(`
  syntax = "proto3";
  message RpcStatus {
    int32 code = 1;
    string message = 2;
  }
`).root.lookupType("RpcStatus")

export function otlpSuccess(format: PayloadFormat): Response {
  if (format === "json") {
    return new Response("{}", {
      status: 200,
      headers: { "content-type": contentTypeFor(format) },
    })
  }
  return new Response(new Uint8Array(), {
    status: 200,
    headers: { "content-type": contentTypeFor(format) },
  })
}

export function otlpError(
  format: PayloadFormat,
  status: number,
  err: OtlpError,
): Response {
  const rpc = { code: status, message: err.message }
  const body =
    format === "protobuf"
      ? RpcStatus.encode(RpcStatus.create(rpc)).finish()
      : new TextEncoder().encode(JSON.stringify(rpc))
  const headers: Record<string, string> = {
    "content-type": contentTypeFor(format),
  }
  if (status === 429) headers["retry-after"] = "1"
  return new Response(body, { status, headers })
}

export function statusForOtlp(err: OtlpError): number {
  switch (err.kind) {
    case "unsupported_media_type":
    case "unsupported_content_encoding":
      return 415
    case "payload_too_large":
      return 413
    case "invalid_payload":
    case "validation":
      return 400
  }
}

export async function withIngestGate(
  c: Context<AppEnv>,
  format: PayloadFormat,
  fn: () => Promise<void>,
): Promise<Response> {
  const gate = c.get("ingestGate")
  if (!gate.tryAcquire()) {
    return otlpError(
      format,
      429,
      new OtlpError("ingest capacity exceeded", "validation"),
    )
  }

  try {
    await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new OtlpError("ingest timed out", "validation"))
        }, 30_000)
      }),
    ])
    return otlpSuccess(format)
  } catch (err) {
    if (err instanceof OtlpError) {
      const status = err.message === "ingest timed out" ? 503 : statusForOtlp(err)
      console.warn("otlp ingest failed", err.message)
      return otlpError(format, status, err)
    }
    const message = err instanceof Error ? err.message : String(err)
    console.warn("otlp ingest storage failed", message)
    return otlpError(
      format,
      503,
      new OtlpError(message, "validation"),
    )
  } finally {
    gate.release()
  }
}
