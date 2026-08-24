import { payloadText, readAttr } from "../../../lib/span-attributes"
import type { Span } from "../../../types"
import type { SpanOverviewStrategy } from "../types"
import { KvRow } from "../KvRow"
import { OverviewSection } from "../OverviewSection"

function RedisOverview({ span }: { span: Span }) {
  const command =
    payloadText(span) ??
    readAttr(span.attributes, "db.statement", "db.query.text")
  const system = readAttr(span.attributes, "db.system")

  return (
    <OverviewSection title="Redis">
      <div className="pb-2 pl-5">
        {system ? (
          <KvRow label="System" fieldKey="db.system">
            {system}
          </KvRow>
        ) : null}
        {command ? (
          <KvRow label="Command" copyValue={command} fieldKey="db.statement">
            <span className="font-mono text-[12px] wrap-break-word whitespace-pre-wrap">
              {command}
            </span>
          </KvRow>
        ) : null}
      </div>
    </OverviewSection>
  )
}

export const redisOverviewStrategy: SpanOverviewStrategy = {
  id: "redis",
  match: (span) => span.type === "redis",
  render: (span) => <RedisOverview span={span} />,
}
