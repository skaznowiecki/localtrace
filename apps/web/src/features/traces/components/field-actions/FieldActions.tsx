import {
  CircleMinusIcon,
  CopyIcon,
  FilterIcon,
  RotateCcwIcon,
} from "lucide-react"
import { useMemo } from "react"

import { ActionMenu } from "@/components/ui/action-menu"

import { useTraceFilters } from "../../hooks/useTraceFilters"
import { formatAttrToken, setAttrInQuery } from "../../lib/trace-filter"
import type { JsonValue } from "../../types"

type FieldActionsProps = {
  fieldKey: string
  value: string
  className?: string
}

const LABEL_MAX = 36

function truncateLabel(value: string): string {
  if (value.length <= LABEL_MAX) return value
  return `${value.slice(0, LABEL_MAX)}…`
}

function copyText(text: string) {
  void navigator.clipboard.writeText(text).catch(() => {
    // ignore clipboard failures
  })
}

export function leafToFilterValue(value: JsonValue): string {
  if (value === null || value === undefined) return "null"
  if (typeof value === "string") return value
  return String(value)
}

export function FieldActions({ fieldKey, value, className }: FieldActionsProps) {
  const { query, setQuery } = useTraceFilters()
  const attrToken = formatAttrToken(fieldKey, value)
  const preview = truncateLabel(attrToken)

  const groups = useMemo(
    () => [
      {
        id: "copy",
        items: [
          {
            id: "copy-value",
            label: "Copy value",
            icon: CopyIcon,
            onSelect: () => copyText(value),
          },
          {
            id: "copy-pair",
            label: "Copy key:value",
            icon: CopyIcon,
            onSelect: () => copyText(`${fieldKey}:${value}`),
          },
        ],
      },
      {
        id: "filter",
        items: [
          {
            id: "filter",
            label: `Filter by ${preview}`,
            icon: FilterIcon,
            onSelect: () => setQuery(setAttrInQuery(query, fieldKey, value)),
          },
          {
            id: "exclude",
            label: `Exclude ${preview}`,
            icon: CircleMinusIcon,
            onSelect: () =>
              setQuery(setAttrInQuery(query, fieldKey, value, { exclude: true })),
          },
          {
            id: "replace",
            label: `Replace filter with ${preview}`,
            icon: RotateCcwIcon,
            onSelect: () => setQuery(formatAttrToken(fieldKey, value)),
          },
        ],
      },
    ],
    [fieldKey, preview, query, setQuery, value],
  )

  return <ActionMenu groups={groups} label={`Actions for ${fieldKey}`} className={className} />
}
