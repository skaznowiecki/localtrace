import { Copyable } from "@/components/ui/copyable"

import { payloadText, readAttr } from "../../../lib/span-attributes"
import type { Span } from "../../../types"
import { highlightSql } from "@/components/attribute-value/strategies/sql"
import type { SpanOverviewStrategy } from "../types"
import { KvRow } from "../KvRow"
import { OverviewSection } from "../OverviewSection"

function formatCount(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return n.toLocaleString("en-US")
}

function formatBytes(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

function formatNs(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  const ms = n / 1e6
  if (ms < 1) return `${(n / 1e3).toFixed(1)} µs`
  if (ms < 1000) return `${ms.toFixed(2)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

function ClickhouseOverview({ span }: { span: Span }) {
  const statement =
    payloadText(span) ??
    readAttr(span.attributes, "db.statement", "db.query.text")
  const system = readAttr(span.attributes, "db.system")
  const host = readAttr(
    span.attributes,
    "server.address",
    "peer.hostname",
    "net.peer.name",
    "peer.service",
  )
  const operation = readAttr(span.attributes, "db.operation")
  const page = readAttr(span.attributes, "clickhouse.page")
  const component = readAttr(span.attributes, "clickhouse.component")
  const queryId = readAttr(span.attributes, "db.clickhouse.query_id")
  const resultRows = readAttr(
    span.attributes,
    "db.clickhouse.result_rows",
    "db.row_count",
  )
  const readRows = readAttr(span.attributes, "db.clickhouse.read_rows")
  const readBytes = readAttr(span.attributes, "db.clickhouse.read_bytes")
  const memory = readAttr(span.attributes, "db.clickhouse.memory_usage")
  const elapsed = readAttr(span.attributes, "db.clickhouse.elapsed_ns")
  const iface = readAttr(span.attributes, "db.clickhouse.interface")

  return (
    <OverviewSection title="ClickHouse">
      <div className="pb-2 pl-5">
        {system ? (
          <KvRow label="System" fieldKey="db.system">
            {system}
          </KvRow>
        ) : null}
        {host ? (
          <KvRow label="Host" fieldKey="server.address">
            {host}
          </KvRow>
        ) : null}
        {operation ? (
          <KvRow label="Operation" fieldKey="db.operation">
            {operation}
          </KvRow>
        ) : null}
        {page ? (
          <KvRow label="Page" fieldKey="clickhouse.page">
            {page}
          </KvRow>
        ) : null}
        {component ? (
          <KvRow label="Component" fieldKey="clickhouse.component">
            {component}
          </KvRow>
        ) : null}
        {queryId ? (
          <KvRow label="Query ID" fieldKey="db.clickhouse.query_id">
            {queryId}
          </KvRow>
        ) : null}
        {resultRows ? (
          <KvRow label="Result rows" copyValue={resultRows}>
            {formatCount(resultRows)}
          </KvRow>
        ) : null}
        {readRows ? (
          <KvRow label="Read rows" copyValue={readRows}>
            {formatCount(readRows)}
          </KvRow>
        ) : null}
        {readBytes ? (
          <KvRow label="Read bytes" copyValue={readBytes}>
            {formatBytes(readBytes)}
          </KvRow>
        ) : null}
        {memory ? (
          <KvRow label="Memory" copyValue={memory}>
            {formatBytes(memory)}
          </KvRow>
        ) : null}
        {elapsed ? (
          <KvRow label="Elapsed" copyValue={elapsed}>
            {formatNs(elapsed)}
          </KvRow>
        ) : null}
        {iface ? <KvRow label="Interface">{iface}</KvRow> : null}
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

export const clickhouseOverviewStrategy: SpanOverviewStrategy = {
  id: "clickhouse",
  match: (span) => span.type === "clickhouse",
  render: (span) => <ClickhouseOverview span={span} />,
}
