import { cn } from "@/lib/utils"

type TraceDurationBarProps = {
  durationMs: number
  maxDurationMs: number
  className?: string
}

export function TraceDurationBar({
  durationMs,
  maxDurationMs,
  className,
}: TraceDurationBarProps) {
  const width =
    maxDurationMs > 0 ? Math.max((durationMs / maxDurationMs) * 100, 1) : 0

  return (
    <div
      className={cn(
        "flex h-3 w-full min-w-[120px] max-w-[220px] overflow-hidden rounded-sm bg-muted",
        className,
      )}
    >
      <div
        className="h-full rounded-sm bg-primary/70"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
