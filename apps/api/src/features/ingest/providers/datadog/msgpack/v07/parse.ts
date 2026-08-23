import { unpackMsgpack } from "../../helpers/unpack"
import { asList, asRecord } from "../../helpers/values"
import { mapTraces } from "../../mappers/traces"
import type { SpanRecord } from "@features/traces/types/span"

export function parse(body: Uint8Array): SpanRecord[] {
  const payload = asRecord(unpackMsgpack(body))
  const chunks = asList(payload.chunks ?? payload.Chunks)
  const traces = chunks.map((chunk) => {
    const rec = asRecord(chunk)
    return asList(rec.spans ?? rec.Spans)
  })
  return mapTraces(traces)
}
