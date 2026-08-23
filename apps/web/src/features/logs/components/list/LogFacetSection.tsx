import { ChevronDownIcon } from "lucide-react"
import { useState, type ReactNode } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type LogFacetSectionProps = {
  title: string
  defaultOpen?: boolean
  isLoading?: boolean
  empty?: boolean
  emptyLabel?: string
  children: ReactNode
}

export function LogFacetSection({
  title,
  defaultOpen = true,
  isLoading = false,
  empty = false,
  emptyLabel = "No values yet",
  children,
}: LogFacetSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b">
      <CollapsibleTrigger
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left",
          "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase",
          "hover:bg-muted/50",
        )}
      >
        {title}
        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-2">
        {isLoading ? (
          <div className="flex flex-col gap-1.5 px-1 py-1">
            <Skeleton className="h-5 w-full rounded-md" />
            <Skeleton className="h-5 w-4/5 rounded-md" />
            <Skeleton className="h-5 w-3/5 rounded-md" />
          </div>
        ) : empty ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">{children}</div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
