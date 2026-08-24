import { payloadText, readAttr } from "../../../lib/span-attributes"
import type { Span } from "../../../types"
import type { SpanOverviewStrategy } from "../types"
import { KvRow } from "../KvRow"
import { OverviewSection } from "../OverviewSection"

function ExpressOverview({ span }: { span: Span }) {
  const kind = readAttr(span.attributes, "express.type")
  const name =
    payloadText(span) ??
    readAttr(span.attributes, "express.name", "http.route")
  const route = readAttr(span.attributes, "http.route")

  return (
    <OverviewSection title="Express">
      <div className="pb-2 pl-5">
        {kind ? (
          <KvRow label="Type" fieldKey="express.type">
            {kind}
          </KvRow>
        ) : null}
        {name ? (
          <KvRow label="Name" fieldKey="express.name">
            {name}
          </KvRow>
        ) : null}
        {route && route !== name ? (
          <KvRow label="Route" fieldKey="http.route">
            {route}
          </KvRow>
        ) : null}
      </div>
    </OverviewSection>
  )
}

export const expressOverviewStrategy: SpanOverviewStrategy = {
  id: "express",
  match: (span) => span.type === "express",
  render: (span) => <ExpressOverview span={span} />,
}
