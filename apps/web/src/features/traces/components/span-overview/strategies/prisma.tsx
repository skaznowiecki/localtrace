import { payloadText, readAttr } from "../../../lib/span-attributes"
import type { Span } from "../../../types"
import type { SpanOverviewStrategy } from "../types"
import { KvRow } from "../KvRow"
import { OverviewSection } from "../OverviewSection"

function PrismaOverview({ span }: { span: Span }) {
  const operation =
    payloadText(span) ?? readAttr(span.attributes, "name")
  const model = readAttr(span.attributes, "model")
  const method = readAttr(span.attributes, "method")

  return (
    <OverviewSection title="Prisma">
      <div className="pb-2 pl-5">
        {operation ? (
          <KvRow label="Operation" fieldKey="name">
            {operation}
          </KvRow>
        ) : (
          <KvRow label="Name">{span.name}</KvRow>
        )}
        {model ? (
          <KvRow label="Model" fieldKey="model">
            {model}
          </KvRow>
        ) : null}
        {method ? (
          <KvRow label="Method" fieldKey="method">
            {method}
          </KvRow>
        ) : null}
      </div>
    </OverviewSection>
  )
}

export const prismaOverviewStrategy: SpanOverviewStrategy = {
  id: "prisma",
  match: (span) => span.type === "prisma",
  render: (span) => <PrismaOverview span={span} />,
}
