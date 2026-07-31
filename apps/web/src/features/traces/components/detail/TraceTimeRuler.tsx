import { formatSpanDuration } from "@/lib/utils"

export const WATERFALL_GRID = "grid grid-cols-[1.5rem_1fr]"

type TraceTimeRulerProps = {
  totalDurationMs: number
}

function formatTick(ms: number): string {
  return formatSpanDuration(ms)
}

function buildTicks(totalDurationMs: number): number[] {
  if (totalDurationMs <= 0) return [0]

  const tickCount = 5
  const step = totalDurationMs / tickCount

  return Array.from({ length: tickCount + 1 }, (_, index) => step * index)
}

export function TraceTimeRuler({ totalDurationMs }: TraceTimeRulerProps) {
  const ticks = buildTicks(totalDurationMs)

  return (
    <div className={`${WATERFALL_GRID} shrink-0 border-b bg-muted/20`}>
      <div />
      <div className="px-2 py-2">
        <div className="relative h-5">
          {ticks.map((tick) => {
            const left =
              totalDurationMs > 0 ? (tick / totalDurationMs) * 100 : 0

            return (
              <div
                key={`tick-${tick}`}
                className="absolute top-0 -translate-x-1/2"
                style={{ left: `${left}%` }}
              >
                <div className="h-2 w-px bg-border" />
                <span className="mt-1 block font-mono text-[10px] text-muted-foreground tabular-nums">
                  {formatTick(tick)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function TraceTimeGrid({
  totalDurationMs,
}: Pick<TraceTimeRulerProps, "totalDurationMs">) {
  const ticks = buildTicks(totalDurationMs)

  return (
    <div className={`${WATERFALL_GRID} pointer-events-none absolute inset-0`}>
      <div />
      <div className="relative px-2">
        {ticks.map((tick) => {
          const left = totalDurationMs > 0 ? (tick / totalDurationMs) * 100 : 0

          return (
            <div
              key={`grid-${tick}`}
              className="absolute top-0 bottom-0 w-px bg-border/60"
              style={{ left: `${left}%` }}
            />
          )
        })}
      </div>
    </div>
  )
}
