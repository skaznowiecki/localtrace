import type { Span } from "../types"
import { payloadText, readAttr } from "./span-attributes"

export type TrpcProcedureType = "query" | "mutation" | "subscription"

export type TrpcSpanMeta = {
  path: string | null
  procedureType: TrpcProcedureType | null
  status: string | null
}

const PROCEDURE_TYPES = new Set<string>(["query", "mutation", "subscription"])

function asProcedureType(value: string | null): TrpcProcedureType | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (PROCEDURE_TYPES.has(normalized)) return normalized as TrpcProcedureType
  return null
}

export function isTrpcSpan(
  span: Pick<Span, "name" | "attributes"> &
    Partial<Pick<Span, "type" | "payloadPath">>,
): boolean {
  if (span.type === "trpc") return true
  if (span.name === "trpc.procedure") return true
  const system = readAttr(span.attributes, "rpc.system.name", "rpc.system")
  return system?.trim().toLowerCase() === "trpc"
}

export function extractTrpcSpanMeta(
  span: Pick<Span, "name" | "attributes"> &
    Partial<Pick<Span, "type" | "payloadPath">>,
): TrpcSpanMeta {
  const path =
    payloadText({
      attributes: span.attributes,
      payloadPath: span.payloadPath ?? null,
    }) ?? readAttr(span.attributes, "trpc.path", "rpc.method")
  const procedureType = asProcedureType(readAttr(span.attributes, "trpc.type"))
  const status = readAttr(span.attributes, "rpc.response.status_code")

  return { path, procedureType, status }
}

/** Procedure path for waterfall / stats; null if this is not a tRPC span. */
export function trpcProcedureLabel(
  span: Pick<Span, "name" | "attributes"> &
    Partial<Pick<Span, "type" | "payloadPath">>,
): string | null {
  if (!isTrpcSpan(span)) return null
  return extractTrpcSpanMeta(span).path
}
