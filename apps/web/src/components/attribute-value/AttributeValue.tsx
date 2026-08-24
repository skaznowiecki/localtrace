import { Copyable } from "@/components/ui/copyable"

import type { JsonValue } from "@/lib/json"
import { attributeValueStrategies } from "./strategies"

type AttributeValueProps = {
  value: JsonValue
}

function resolveStringStrategy(value: string) {
  return (
    attributeValueStrategies.find((strategy) => strategy.match(value)) ??
    attributeValueStrategies[attributeValueStrategies.length - 1]
  )
}

function toClipboardText(value: JsonValue): string {
  if (value === null || value === undefined) return "null"
  if (typeof value === "string") return value
  return String(value)
}

export function AttributeValue({ value }: AttributeValueProps) {
  const clipboardText = toClipboardText(value)

  let content
  if (value === null || value === undefined) {
    content = <span className="text-muted-foreground italic">null</span>
  } else if (typeof value === "boolean") {
    content = <span className="text-foreground">{String(value)}</span>
  } else if (typeof value === "number") {
    content = <span className="tabular-nums text-foreground">{value}</span>
  } else {
    const str = String(value)
    const strategy = resolveStringStrategy(str)
    content = strategy.render(str)
  }

  return <Copyable value={clipboardText}>{content}</Copyable>
}
