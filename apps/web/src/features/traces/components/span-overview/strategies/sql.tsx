import { Copyable } from "@/components/ui/copyable"

import { payloadText, readAttr } from "../../../lib/span-attributes"
import type { Span } from "../../../types"
import { highlightSql } from "../../attribute-value/strategies/sql"
import type { SpanOverviewStrategy } from "../types"
import { KvRow } from "../KvRow"
import { OverviewSection } from "../OverviewSection"

const SQL_TYPES = new Set(["postgres", "mysql", "sqlite", "sql"])

function SqlOverview({ span }: { span: Span }) {
  const statement =
    payloadText(span) ??
    readAttr(span.attributes, "db.statement", "db.query.text")
  const system = readAttr(span.attributes, "db.system")
  const host = readAttr(
    span.attributes,
    "server.address",
    "net.peer.name",
    "peer.service",
    "db.name",
  )

  return (
    <OverviewSection title="SQL">
      <div className="pb-2 pl-5">
        {system ? <KvRow label="System">{system}</KvRow> : null}
        {host ? <KvRow label="Host">{host}</KvRow> : null}
        {statement ? (
          <div className="mt-2">
            <Copyable value={statement} className="w-full">
              <pre className="font-mono text-[12px] leading-relaxed wrap-break-word whitespace-pre-wrap text-foreground">
                {highlightSql(statement)}
              </pre>
            </Copyable>
          </div>
        ) : null}
      </div>
    </OverviewSection>
  )
}

export const sqlOverviewStrategy: SpanOverviewStrategy = {
  id: "sql",
  match: (span) => span.type != null && SQL_TYPES.has(span.type),
  render: (span) => <SqlOverview span={span} />,
}
