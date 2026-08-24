import type { ReactNode } from "react"

import { Copyable } from "@/components/ui/copyable"
import { cn } from "@/lib/utils"

import { FieldActions } from "../field-actions/FieldActions"

type KvRowProps = {
  label: string
  children: ReactNode
  /** Clipboard text; defaults to string children when present. */
  copyValue?: string
  /** Dotted attribute path for filter/copy actions. */
  fieldKey?: string
  className?: string
}

/** Label/value row for custom span overviews (HyperDX-style). */
export function KvRow({
  label,
  children,
  copyValue,
  fieldKey,
  className,
}: KvRowProps) {
  const clipboard =
    copyValue ?? (typeof children === "string" ? children : undefined)

  return (
    <div
      className={cn(
        "group/field grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 py-0.5 text-[13px]",
        className,
      )}
    >
      <span className="flex min-w-[130px] max-w-[min(16rem,45%)] items-start gap-0.5 break-all font-medium text-muted-foreground">
        {fieldKey && clipboard != null ? (
          <FieldActions fieldKey={fieldKey} value={clipboard} />
        ) : null}
        {label}
      </span>
      <div className="min-w-0 break-all text-sky-700 dark:text-sky-400">
        {clipboard != null ? (
          <Copyable value={clipboard}>{children}</Copyable>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
