import { decode } from "@msgpack/msgpack"
import { invalidPayload } from "./ids"

export function unpackMsgpack(body: Uint8Array): unknown {
  try {
    return decode(body, { useBigInt64: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    invalidPayload(`msgpack decode failed: ${message}`)
  }
}
