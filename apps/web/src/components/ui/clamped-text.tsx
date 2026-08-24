"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

const LINE_CLAMP: Record<number, string> = {
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
  6: "line-clamp-6",
}

type ClampedTextProps = {
  children: ReactNode
  /** Max visible lines while collapsed. */
  lines?: number
  /** Reset expand state when this identity changes (e.g. span id or value). */
  resetKey?: string
  className?: string
}

/** Multi-line clamp with See more / See less when the content overflows. */
export function ClampedText({
  children,
  lines = 4,
  resetKey,
  className,
}: ClampedTextProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    setExpanded(false)
    setOverflows(false)
  }, [resetKey])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || expanded) return

    const measure = () => {
      setOverflows(el.scrollHeight > el.clientHeight + 1)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [children, expanded, lines, resetKey])

  const clampClass = LINE_CLAMP[lines] ?? LINE_CLAMP[4]

  return (
    <div className={cn("min-w-0", className)}>
      <div
        ref={ref}
        className={cn("min-w-0 break-all", !expanded && clampClass)}
      >
        {children}
      </div>
      {overflows ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className="mt-0.5 cursor-pointer text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          {expanded ? "See less" : "See more"}
        </button>
      ) : null}
    </div>
  )
}
