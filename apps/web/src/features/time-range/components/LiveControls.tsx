import { ChevronDownIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import {
  LOOKBACK_PRESETS,
  type LookbackPreset,
} from "../TimeRangeProvider"

type LiveControlsProps = {
  live: boolean
  onLiveChange: (live: boolean) => void
  preset: LookbackPreset
  onPresetChange: (preset: LookbackPreset) => void
}

export function LiveControls({
  live,
  onLiveChange,
  preset,
  onPresetChange,
}: LiveControlsProps) {
  const [presetOpen, setPresetOpen] = useState(false)
  const presetLabel =
    LOOKBACK_PRESETS.find((option) => option.id === preset)?.label ?? "Latest"

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Popover open={presetOpen} onOpenChange={setPresetOpen} modal={false}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 font-normal"
            />
          }
        >
          {presetLabel}
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-36 gap-0.5 rounded-2xl p-1"
        >
          {LOOKBACK_PRESETS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={cn(
                "flex w-full cursor-pointer items-center rounded-xl px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                option.id === preset && "bg-muted font-medium",
              )}
              onClick={() => {
                onPresetChange(option.id)
                setPresetOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant={live ? "secondary" : "outline"}
        size="sm"
        className={cn(
          "min-w-22 gap-1.5 font-medium",
          live && "text-foreground",
        )}
        aria-pressed={live}
        onClick={() => onLiveChange(!live)}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            live
              ? "animate-pulse bg-emerald-500"
              : "bg-muted-foreground/40",
          )}
          aria-hidden
        />
        {live ? "LIVE" : "Paused"}
      </Button>
    </div>
  )
}
