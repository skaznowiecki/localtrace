import { extractTrpcSpanMeta, isTrpcSpan } from "../../../lib/trpc-spans"
import { TrpcTypeBadge } from "../../display/TrpcTypeBadge"
import type { Span } from "../../../types"
import type { SpanNameInput, SpanNameStrategy } from "../types"

function asSpan(input: SpanNameInput): Pick<
  Span,
  "name" | "type" | "attributes" | "payloadPath"
> {
  return {
    name: input.name,
    type: null,
    attributes: input.attributes ?? {},
    payloadPath: null,
  }
}

export const trpcStrategy: SpanNameStrategy = {
  id: "trpc",
  match: (input) => isTrpcSpan(asSpan(input)),
  render: (input) => {
    const meta = extractTrpcSpanMeta(asSpan(input))
    const path = meta.path ?? input.name
    const title = meta.procedureType ? `${meta.procedureType} ${path}` : path

    if (input.compact) {
      return (
        <span className="block truncate font-mono text-[12px]" title={title}>
          {path}
        </span>
      )
    }

    return (
      <span
        className="inline-flex min-w-0 max-w-full items-center gap-1.5"
        title={title}
      >
        {meta.procedureType ? (
          <TrpcTypeBadge type={meta.procedureType} />
        ) : null}
        <span className="min-w-0 truncate font-mono text-[12px] text-foreground">
          {path}
        </span>
      </span>
    )
  },
}
