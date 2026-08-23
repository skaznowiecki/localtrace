import { unpackMsgpack } from "../../helpers/unpack"
import { mapTraces } from "../../mappers/traces"
import type { SpanRecord } from "@features/traces/types/span"

export function parse(body: Uint8Array): SpanRecord[] {
  return mapTraces(unpackMsgpack(body))
}
