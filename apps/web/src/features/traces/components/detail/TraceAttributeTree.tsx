import {
  AttributeTree as SharedAttributeTree,
  isAttributeTreeEmpty,
} from "@/components/AttributeTree"
import type { JsonValue } from "@/lib/json"

import { FieldActions } from "../field-actions/FieldActions"

type TraceAttributeTreeProps = {
  value: JsonValue
  className?: string
}

export { isAttributeTreeEmpty }

export function TraceAttributeTree({
  value,
  className,
}: TraceAttributeTreeProps) {
  return (
    <SharedAttributeTree
      value={value}
      className={className}
      renderLeafActions={({ path, value: leaf }) => (
        <FieldActions fieldKey={path} value={leaf} />
      )}
    />
  )
}
