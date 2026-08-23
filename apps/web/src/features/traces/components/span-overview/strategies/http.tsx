import { ExternalLinkIcon } from "lucide-react"
import type { ReactNode } from "react"

import {
  extractHttpSpanMeta,
  type HttpSpanMeta,
} from "../../../lib/http-spans"
import type { Span } from "../../../types"
import { HttpMethodBadge } from "../../display/HttpMethodBadge"
import { HttpPath } from "../../display/HttpPath"
import { HttpStatusCodeBadge } from "../../display/HttpStatusCodeBadge"
import type { SpanOverviewStrategy } from "../types"
import { KvRow } from "../KvRow"
import { OverviewSection } from "../OverviewSection"

function UrlLink({ href }: { href: string }) {
  const isAbsolute = /^https?:\/\//i.test(href)
  if (!isAbsolute) {
    return <HttpPath value={href} className="break-all font-sans" />
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex cursor-pointer items-start gap-1 break-all text-inherit hover:underline"
    >
      <HttpPath value={href} className="font-sans" />
      <ExternalLinkIcon className="mt-0.5 size-3 shrink-0 text-sky-700 opacity-70 dark:text-sky-400" />
    </a>
  )
}

function Subheading({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 mb-1 text-[12px] font-bold tracking-wide text-foreground uppercase">
      {children}
    </p>
  )
}

function HttpRequestsBody({ meta }: { meta: HttpSpanMeta }) {
  return (
    <div className="pb-2 pl-5">
      {meta.method ? (
        <KvRow label="Method" copyValue={meta.method}>
          <HttpMethodBadge method={meta.method} className="text-[12px]" />
        </KvRow>
      ) : null}
      {meta.statusCode ? (
        <KvRow label="Status Code" copyValue={meta.statusCode}>
          <HttpStatusCodeBadge code={meta.statusCode} className="text-[12px]" />
        </KvRow>
      ) : null}
      {meta.url ? (
        <KvRow label="URL" copyValue={meta.url}>
          <UrlLink href={meta.url} />
        </KvRow>
      ) : null}
      {meta.userAgent ? (
        <KvRow label="User Agent">{meta.userAgent}</KvRow>
      ) : null}
      {meta.route ? <KvRow label="http.route">{meta.route}</KvRow> : null}
      {meta.version ? (
        <KvRow label="http.version">{meta.version}</KvRow>
      ) : null}

      {(meta.host || meta.path || meta.scheme) && (
        <>
          <Subheading>URL Details</Subheading>
          {meta.host ? <KvRow label="HTTP Host">{meta.host}</KvRow> : null}
          {meta.path ? (
            <KvRow label="HTTP Path" copyValue={meta.path}>
              <HttpPath value={meta.path} className="font-sans" />
            </KvRow>
          ) : null}
          {meta.scheme ? (
            <KvRow label="HTTP Scheme">{meta.scheme}</KvRow>
          ) : null}
        </>
      )}

      {meta.queryParams.length > 0 ? (
        <>
          <Subheading>Query Parameters</Subheading>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 text-[13px]">
            {meta.queryParams.map((param, i) => (
              <KvRow
                key={`${param.key}-${i}`}
                label={param.key}
                className="contents"
              >
                {param.value}
              </KvRow>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

export function HttpLikeOverview({
  span,
  title,
}: {
  span: Span
  title: string
}) {
  const meta = extractHttpSpanMeta(span)

  return (
    <OverviewSection title={title}>
      <HttpRequestsBody meta={meta} />
    </OverviewSection>
  )
}

export const httpOverviewStrategy: SpanOverviewStrategy = {
  id: "http",
  match: (span) => span.type === "http",
  render: (span) => <HttpLikeOverview span={span} title="HTTP Requests" />,
}
