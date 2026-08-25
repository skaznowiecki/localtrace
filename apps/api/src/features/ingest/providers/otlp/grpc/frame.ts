import { IngestError } from "../../errors"

export type GrpcFrame = {
  compressed: boolean
  payload: Uint8Array
}

export function encodeFrame(
  message: Uint8Array,
  compressed = false,
): Uint8Array {
  const out = new Uint8Array(5 + message.byteLength)
  out[0] = compressed ? 1 : 0
  new DataView(out.buffer, out.byteOffset, 5).setUint32(1, message.byteLength)
  out.set(message, 5)
  return out
}

export function decodeFrames(body: Uint8Array): GrpcFrame[] {
  const frames: GrpcFrame[] = []
  let offset = 0
  while (offset < body.byteLength) {
    if (body.byteLength - offset < 5) {
      throw new IngestError("invalid_payload", "truncated grpc frame")
    }
    const flag = body[offset] ?? 0
    if (flag > 1) {
      throw new IngestError("invalid_payload", "invalid grpc compression flag")
    }
    const length = new DataView(
      body.buffer,
      body.byteOffset + offset,
      5,
    ).getUint32(1)
    offset += 5
    if (body.byteLength - offset < length) {
      throw new IngestError("invalid_payload", "truncated grpc frame")
    }
    frames.push({
      compressed: flag === 1,
      payload: body.subarray(offset, offset + length),
    })
    offset += length
  }
  return frames
}

export const EMPTY_GRPC_FRAME = encodeFrame(new Uint8Array())
