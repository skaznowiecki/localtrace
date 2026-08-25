import {
  createServer,
  type Http2Server,
  type Http2ServerRequest,
  type Http2ServerResponse,
} from "node:http2"
import type { Db } from "@shared/db"
import { log } from "@shared/helpers"
import { AppError } from "@shared/errors"
import { IngestError } from "../../errors"
import { EMPTY_GRPC_FRAME } from "./frame"
import { execute } from "./handle"

export type GrpcListener = {
  port: number
  close: () => Promise<void>
}

const GRPC_OK = 0
const GRPC_INVALID_ARGUMENT = 3
const GRPC_RESOURCE_EXHAUSTED = 8
const GRPC_UNIMPLEMENTED = 12
const GRPC_INTERNAL = 13

export async function listen(opts: {
  port: number
  db: Db
  maxBytes: number
  hostname?: string
}): Promise<GrpcListener> {
  const hostname = opts.hostname ?? "0.0.0.0"
  const server = createServer((req, res) => {
    void onRequest(req, res, opts.db, opts.maxBytes).catch((err) => {
      log.error(err)
      if (!res.headersSent) {
        writeStatus(res, GRPC_INTERNAL, "internal error")
      }
    })
  })

  const port = await bind(server, opts.port, hostname)
  return {
    port,
    close: () => closeServer(server),
  }
}

async function onRequest(
  req: Http2ServerRequest,
  res: Http2ServerResponse,
  db: Db,
  maxBytes: number,
): Promise<void> {
  try {
    const body = await readBody(req, maxBytes)
    const encoding = headerValue(req.headers["grpc-encoding"])
    await execute({
      db,
      path: req.url ?? "/",
      body,
      encoding,
      maxBytes,
    })
    writeStatus(res, GRPC_OK)
  } catch (err) {
    const mapped = mapError(err)
    writeStatus(res, mapped.status, mapped.message)
  }
}

function mapError(err: unknown): { status: number; message: string } {
  if (err instanceof IngestError) {
    if (err.type === "payload_too_large") {
      return { status: GRPC_RESOURCE_EXHAUSTED, message: err.message }
    }
    if (err.type === "unsupported_protocol") {
      return { status: GRPC_UNIMPLEMENTED, message: err.message }
    }
    if (
      err.type === "invalid_payload" ||
      err.type === "validation" ||
      err.type === "unsupported_content_encoding" ||
      err.type === "unsupported_media_type"
    ) {
      return { status: GRPC_INVALID_ARGUMENT, message: err.message }
    }
  }
  if (err instanceof AppError) {
    return { status: GRPC_INTERNAL, message: err.message }
  }
  const message = err instanceof Error ? err.message : String(err)
  return { status: GRPC_INTERNAL, message }
}

function writeStatus(
  res: Http2ServerResponse,
  status: number,
  message?: string,
): void {
  const stream = res.stream
  if (stream.destroyed || stream.headersSent) return
  const grpcHeaders: Record<string, string> = {
    "grpc-status": String(status),
  }
  if (message) grpcHeaders["grpc-message"] = encodeURIComponent(message)
  stream.respond(
    {
      ":status": 200,
      "content-type": "application/grpc",
      ...grpcHeaders,
    },
    { waitForTrailers: true },
  )
  stream.once("wantTrailers", () => {
    stream.sendTrailers(grpcHeaders)
  })
  if (status === GRPC_OK) {
    stream.end(EMPTY_GRPC_FRAME)
  } else {
    stream.end()
  }
}

async function readBody(
  req: Http2ServerRequest,
  maxBytes: number,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = chunk instanceof Uint8Array ? chunk : Buffer.from(chunk)
    size += buf.byteLength
    if (size > maxBytes) {
      throw new IngestError("payload_too_large")
    }
    chunks.push(buf)
  }
  if (chunks.length === 0) return new Uint8Array()
  const first = chunks[0]
  if (chunks.length === 1 && first) return first
  const out = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function bind(
  server: Http2Server,
  port: number,
  hostname: string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (err: Error) => reject(err)
    server.once("error", onError)
    server.listen(port, hostname, () => {
      server.off("error", onError)
      const addr = server.address()
      if (!addr || typeof addr === "string") {
        reject(new Error("grpc listen: missing address"))
        return
      }
      resolve(addr.port)
    })
  })
}

function closeServer(server: Http2Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })
}
