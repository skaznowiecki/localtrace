import type { ReactNode } from "react"

import { Copyable } from "@/components/ui/copyable"
import { cn } from "@/lib/utils"

type KvRowProps = {
  label: string
  children: ReactNode
  /** Clipboard text; defaults to string children when present. */
  copyValue?: string
  className?: string
}

/** Label/value row for custom span overviews (HyperDX-style). */
export function KvRow({ label, children, copyValue, className }: KvRowProps) {
  const clipboard =
    copyValue ?? (typeof children === "string" ? children : undefined)

  return (
    <div className={cn("flex items-start gap-3 py-0.5 text-[13px]", className)}>
      <span className="w-[130px] shrink-0 font-bold text-foreground/80">
        {label}
      </span>
      <div className="min-w-0 flex-1 break-all text-sky-700 dark:text-sky-400">
        {clipboard != null ? (
          <Copyable value={clipboard}>{children}</Copyable>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
