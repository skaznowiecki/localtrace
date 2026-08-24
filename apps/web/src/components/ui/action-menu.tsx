"use client"

import type { LucideIcon } from "lucide-react"
import { EllipsisVerticalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type ActionMenuItem = {
  id: string
  label: string
  icon?: LucideIcon
  onSelect: () => void
}

export type ActionMenuGroup = {
  id: string
  items: ActionMenuItem[]
}

type ActionMenuProps = {
  items?: ActionMenuItem[]
  groups?: ActionMenuGroup[]
  label?: string
  className?: string
}

export function ActionMenu({
  items,
  groups,
  label = "Actions",
  className,
}: ActionMenuProps) {
  const resolvedGroups: ActionMenuGroup[] =
    groups ?? (items && items.length > 0 ? [{ id: "actions", items }] : [])

  if (resolvedGroups.every((group) => group.items.length === 0)) return null

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        nativeButton={false}
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            className={cn(
              "size-5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/field:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100",
              className,
            )}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={4}
        className="w-auto min-w-56"
      >
        {resolvedGroups.map((group, index) => (
          <div key={group.id}>
            {index > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuGroup>
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={(event) => {
                      event.stopPropagation()
                      item.onSelect()
                    }}
                  >
                    {Icon ? <Icon /> : null}
                    {item.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
