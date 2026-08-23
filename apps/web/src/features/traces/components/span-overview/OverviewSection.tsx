import { ChevronDownIcon } from "lucide-react"
import { useState, type ReactNode } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

type OverviewSectionProps = {
  title: string
  children: ReactNode
}

/** Collapsible wrapper shared by span Overview strategies. */
export function OverviewSection({ title, children }: OverviewSectionProps) {
  const [open, setOpen] = useState(true)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-1">
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-1.5 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground">
        <ChevronDownIcon
          className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
        />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  )
}
