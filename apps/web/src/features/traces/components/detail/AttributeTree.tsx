import { ChevronRightIcon } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"

import type { JsonValue } from "../../types"
import { AttributeValue } from "../attribute-value"

type AttributeTreeProps = {
  value: JsonValue
  className?: string
}

export function isAttributeTreeEmpty(value: JsonValue): boolean {
  if (value === null || value === undefined) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "object") return Object.keys(value).length === 0
  return false
}

function KeyToken({ name }: { name: string }) {
  return <span className="text-slate-500 dark:text-slate-400">{name}</span>
}

function JsonNode({
  keyName,
  value,
  depth,
}: {
  keyName?: string
  value: JsonValue
  depth: number
}) {
  const isArray = Array.isArray(value)
  const isObject = !isArray && value !== null && typeof value === "object"
  const isContainer = isArray || isObject
  // Only auto-expand the root; deep trees stay closed until clicked (keeps span switching cheap).
  const [open, setOpen] = useState(depth < 1)

  if (!isContainer) {
    return (
      <div className="flex items-baseline gap-2 py-0.5 leading-7">
        <span className="inline-block size-4 shrink-0" />
        <span className="min-w-0">
          {keyName !== undefined ? (
            <>
              <KeyToken name={keyName} />{" "}
            </>
          ) : null}
          <AttributeValue value={value} />
        </span>
      </div>
    )
  }

  const entries: [string | undefined, JsonValue][] = isArray
    ? (value as JsonValue[]).map((item) => [undefined, item])
    : Object.entries(value as { [key: string]: JsonValue })

  const openBrace = isArray ? "[" : "{"
  const closeBrace = isArray ? "]" : "}"

  if (entries.length === 0) {
    return (
      <div className="flex items-baseline gap-2 py-0.5 leading-7">
        <span className="inline-block size-4 shrink-0" />
        <span>
          {keyName !== undefined ? (
            <>
              <KeyToken name={keyName} />{" "}
            </>
          ) : null}
          <span className="text-muted-foreground">
            {openBrace}
            {closeBrace}
          </span>
        </span>
      </div>
    )
  }

  const count = entries.length

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-baseline gap-1 py-0.5 text-left leading-7"
      >
        <ChevronRightIcon
          className={cn(
            "size-4 shrink-0 self-center text-muted-foreground/60 transition-transform",
            open && "rotate-90",
          )}
        />
        <span>
          {keyName !== undefined ? (
            <>
              <KeyToken name={keyName} />{" "}
            </>
          ) : null}
          <span className="text-muted-foreground">{openBrace}</span>
          {!open ? (
            <>
              <span className="px-1 text-muted-foreground/70">
                {count} {count === 1 ? "item" : "items"}
              </span>
              <span className="text-muted-foreground">{closeBrace}</span>
            </>
          ) : null}
        </span>
      </button>

      {open ? (
        <>
          <div className="ml-3 border-l border-border/50 pl-4">
            {entries.map(([childKey, childValue], index) => (
              <JsonNode
                key={childKey ?? `idx-${index}`}
                keyName={childKey}
                value={childValue}
                depth={depth + 1}
              />
            ))}
          </div>
          <div className="flex items-baseline py-0.5 leading-7">
            <span className="inline-block size-4 shrink-0" />
            <span className="text-muted-foreground">{closeBrace}</span>
          </div>
        </>
      ) : null}
    </div>
  )
}

export function AttributeTree({ value, className }: AttributeTreeProps) {
  if (isAttributeTreeEmpty(value)) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No attributes
      </p>
    )
  }

  return (
    <div
      className={cn(
        "overflow-x-auto px-1 py-2 font-mono text-[13px]",
        className,
      )}
    >
      <JsonNode value={value} depth={0} />
    </div>
  )
}
