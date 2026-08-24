import { ChevronRightIcon } from "lucide-react"
import { useState, type ReactNode } from "react"

import { AttributeValue } from "@/components/attribute-value"
import type { JsonValue } from "@/lib/json"
import { cn } from "@/lib/utils"

export type AttributeTreeLeafActionsArgs = {
  path: string
  value: string
}

type AttributeTreeProps = {
  value: JsonValue
  className?: string
  renderLeafActions?: (args: AttributeTreeLeafActionsArgs) => ReactNode
}

export function isAttributeTreeEmpty(value: JsonValue): boolean {
  if (value === null || value === undefined) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "object") return Object.keys(value).length === 0
  return false
}

function leafToDisplayValue(value: JsonValue): string {
  if (value === null || value === undefined) return "null"
  if (typeof value === "string") return value
  return String(value)
}

function joinPath(parent: string | undefined, segment: string): string {
  return parent ? `${parent}.${segment}` : segment
}

function KeyToken({ name }: { name: string }) {
  return <span className="text-slate-500 dark:text-slate-400">{name}</span>
}

function Glyph({ children }: { children?: ReactNode }) {
  return (
    <span className="inline-flex size-4 shrink-0 items-center justify-center">
      {children}
    </span>
  )
}

function Row({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 py-0.5 leading-7",
        className,
      )}
    >
      {children}
    </div>
  )
}

function JsonNode({
  keyName,
  path,
  value,
  depth,
  renderLeafActions,
}: {
  keyName?: string
  path?: string
  value: JsonValue
  depth: number
  renderLeafActions?: (args: AttributeTreeLeafActionsArgs) => ReactNode
}) {
  const isArray = Array.isArray(value)
  const isObject = !isArray && value !== null && typeof value === "object"
  const isContainer = isArray || isObject
  // Only auto-expand the root; deep trees stay closed until clicked (keeps span switching cheap).
  const [open, setOpen] = useState(depth < 1)

  if (!isContainer) {
    const actions =
      path && renderLeafActions
        ? renderLeafActions({ path, value: leafToDisplayValue(value) })
        : null

    return (
      <Row className="group/field">
        {actions ?? <Glyph />}
        <span className="min-w-0">
          {keyName !== undefined ? (
            <>
              <KeyToken name={keyName} />{" "}
            </>
          ) : null}
          <AttributeValue value={value} />
        </span>
      </Row>
    )
  }

  const entries: [string | undefined, JsonValue][] = isArray
    ? (value as JsonValue[]).map((item) => [undefined, item])
    : Object.entries(value as { [key: string]: JsonValue })

  const openBrace = isArray ? "[" : "{"
  const closeBrace = isArray ? "]" : "}"

  if (entries.length === 0) {
    return (
      <Row>
        <Glyph />
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
      </Row>
    )
  }

  const count = entries.length

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-1.5 py-0.5 text-left leading-7"
      >
        <Glyph>
          <ChevronRightIcon
            className={cn(
              "size-3.5 text-muted-foreground/60 transition-transform",
              open && "rotate-90",
            )}
          />
        </Glyph>
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
          <div className="ml-[7px] border-l border-border/50 pl-[13px]">
            {entries.map(([childKey, childValue], index) => {
              const segment = childKey ?? String(index)
              return (
                <JsonNode
                  key={childKey ?? `idx-${index}`}
                  keyName={childKey}
                  path={joinPath(path, segment)}
                  value={childValue}
                  depth={depth + 1}
                  renderLeafActions={renderLeafActions}
                />
              )
            })}
          </div>
          <Row>
            <Glyph />
            <span className="text-muted-foreground">{closeBrace}</span>
          </Row>
        </>
      ) : null}
    </div>
  )
}

export function AttributeTree({
  value,
  className,
  renderLeafActions,
}: AttributeTreeProps) {
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
      <JsonNode
        value={value}
        depth={0}
        renderLeafActions={renderLeafActions}
      />
    </div>
  )
}
