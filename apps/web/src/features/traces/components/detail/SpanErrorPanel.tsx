import { AlertCircleIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Copyable } from "@/components/ui/copyable"

import {
  extractSpanError,
  type SpanErrorInfo,
} from "../../lib/span-error"
import type { Span } from "../../types"

const STACK_PREVIEW_LINES = 6

function errorCopyText(error: SpanErrorInfo): string {
  if (error.stacktrace) {
    if (error.message && error.stacktrace.includes(error.message)) {
      return error.stacktrace
    }
    const headline = [error.type ?? "Error", error.message]
      .filter(Boolean)
      .join(": ")
    return `${headline}\n\n${error.stacktrace}`
  }
  if (error.message) {
    return error.type ? `${error.type}: ${error.message}` : error.message
  }
  return error.type ?? "Error"
}

export function SpanErrorPanel({ span }: { span: Span }) {
  const error = extractSpanError(span)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setExpanded(false)
  }, [span.id])

  if (!error || (!error.message && !error.stacktrace)) return null

  const title = error.type ?? "Error"
  const stackLines = error.stacktrace?.split("\n") ?? []
  const needsToggle = stackLines.length > STACK_PREVIEW_LINES
  const stackText =
    error.stacktrace == null
      ? null
      : expanded || !needsToggle
        ? error.stacktrace
        : stackLines.slice(0, STACK_PREVIEW_LINES).join("\n")

  return (
    <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5">
      <Copyable value={errorCopyText(error)} className="w-full" label="Copy error">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-destructive">{title}</p>
            {error.message ? (
              <p className="mt-0.5 text-[13px] text-destructive/90">
                {error.message}
              </p>
            ) : null}
            {stackText ? (
              <pre className="mt-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-destructive/80">
                {stackText}
              </pre>
            ) : null}
          </div>
        </div>
      </Copyable>
      {needsToggle ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className="mt-1 block w-full cursor-pointer text-right text-[12px] font-bold text-destructive hover:text-destructive/80"
        >
          {expanded ? "See less" : "See more"}
        </button>
      ) : null}
    </div>
  )
}
