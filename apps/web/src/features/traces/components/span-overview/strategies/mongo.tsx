import { payloadText, readAttr } from "../../../lib/span-attributes"
import type { Span } from "../../../types"
import type { SpanOverviewStrategy } from "../types"
import { KvRow } from "../KvRow"
import { OverviewSection } from "../OverviewSection"

function MongoOverview({ span }: { span: Span }) {
  const query =
    payloadText(span) ??
    readAttr(span.attributes, "db.statement", "db.query.text")
  const system = readAttr(span.attributes, "db.system")

  return (
    <OverviewSection title="Mongo">
      <div className="pb-2 pl-5">
        {system ? (
          <KvRow label="System" fieldKey="db.system">
            {system}
          </KvRow>
        ) : null}
        {query ? (
          <KvRow label="Query" copyValue={query} fieldKey="db.statement">
            <pre className="font-mono text-[12px] leading-relaxed wrap-break-word whitespace-pre-wrap text-foreground">
              {query}
            </pre>
          </KvRow>
        ) : null}
      </div>
    </OverviewSection>
  )
}

export const mongoOverviewStrategy: SpanOverviewStrategy = {
  id: "mongo",
  match: (span) => span.type === "mongo",
  render: (span) => <MongoOverview span={span} />,
}
