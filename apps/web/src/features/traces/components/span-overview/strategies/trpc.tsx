import { payloadText, readAttr } from "../../../lib/span-attributes"
import type { Span } from "../../../types"
import { extractTrpcSpanMeta } from "../../../lib/trpc-spans"
import { TrpcTypeBadge } from "../../display/TrpcTypeBadge"
import type { SpanOverviewStrategy } from "../types"
import { KvRow } from "../KvRow"
import { OverviewSection } from "../OverviewSection"

function TrpcOverview({ span }: { span: Span }) {
  const meta = extractTrpcSpanMeta(span)
  const path =
    meta.path ??
    payloadText(span) ??
    readAttr(span.attributes, "trpc.path", "rpc.method")

  return (
    <OverviewSection title="tRPC">
      <div className="pb-2 pl-5">
        {path ? (
          <KvRow label="Procedure" copyValue={path} fieldKey="trpc.path">
            <span className="font-mono text-[12px]">{path}</span>
          </KvRow>
        ) : (
          <KvRow label="Name">{span.name}</KvRow>
        )}
        {meta.procedureType ? (
          <KvRow
            label="Type"
            copyValue={meta.procedureType}
            fieldKey="trpc.type"
          >
            <TrpcTypeBadge type={meta.procedureType} className="text-[12px]" />
          </KvRow>
        ) : null}
        {meta.status ? (
          <KvRow
            label="Status"
            copyValue={meta.status}
            fieldKey="rpc.response.status_code"
          >
            {meta.status}
          </KvRow>
        ) : null}
      </div>
    </OverviewSection>
  )
}

export const trpcOverviewStrategy: SpanOverviewStrategy = {
  id: "trpc",
  match: (span) => span.type === "trpc",
  render: (span) => <TrpcOverview span={span} />,
}
