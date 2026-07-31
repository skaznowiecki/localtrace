"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type CopyableProps = {
  value: string
  children: ReactNode
  className?: string
  label?: string
}

export function Copyable({
  value,
  children,
  className,
  label = "Copy to clipboard",
}: CopyableProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timeout)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <span
      className={cn(
        "group/copyable inline-flex max-w-full items-start gap-1",
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="mt-0.5 size-5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/copyable:opacity-100 focus-visible:opacity-100"
              onClick={(event) => {
                event.stopPropagation()
                void copy()
              }}
              aria-label={copied ? "Copied" : label}
            />
          }
        >
          {copied ? (
            <CheckIcon className="size-3 text-emerald-600" />
          ) : (
            <CopyIcon className="size-3" />
          )}
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied" : label}</TooltipContent>
      </Tooltip>
    </span>
  )
}
