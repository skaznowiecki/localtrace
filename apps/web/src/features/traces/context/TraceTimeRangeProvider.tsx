import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react"

export type TraceLookbackPreset = "latest" | "15m" | "1h" | "6h"

export const TRACE_LOOKBACK_PRESETS: Array<{
  id: TraceLookbackPreset
  label: string
  lookbackMs: number | null
}> = [
  { id: "latest", label: "Latest", lookbackMs: null },
  { id: "15m", label: "Last 15m", lookbackMs: 15 * 60_000 },
  { id: "1h", label: "Last 1h", lookbackMs: 60 * 60_000 },
  { id: "6h", label: "Last 6h", lookbackMs: 6 * 60 * 60_000 },
]

const LOOKBACK_MS: Record<TraceLookbackPreset, number | null> = {
  latest: null,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "6h": 6 * 60 * 60_000,
}

function sinceIsoFromLookback(lookbackMs: number): string {
  return new Date(Date.now() - lookbackMs).toISOString()
}

type TraceTimeRangeContextValue = {
  live: boolean
  preset: TraceLookbackPreset
  lookbackMs: number | null
  /** Absolute since when paused; ignored while LIVE (sliding window in queryFn). */
  pausedSince: string | undefined
  setLive: (live: boolean) => void
  setPreset: (preset: TraceLookbackPreset) => void
}

const TraceTimeRangeContext = createContext<TraceTimeRangeContextValue | null>(
  null,
)

/**
 * LIVE polling + short relative lookback for the traces list.
 * Shared between the app header controls and the list query.
 * State is in-memory only — not synced to the URL.
 */
export function TraceTimeRangeProvider({ children }: { children: ReactNode }) {
  const [live, setLiveState] = useState(true)
  const [preset, setPresetState] = useState<TraceLookbackPreset>("latest")
  const [pausedSince, setPausedSince] = useState<string | undefined>()

  const lookbackMs = LOOKBACK_MS[preset]

  const setLive = (next: boolean) => {
    if (!next && live) {
      setPausedSince(
        lookbackMs != null ? sinceIsoFromLookback(lookbackMs) : undefined,
      )
    } else if (next) {
      setPausedSince(undefined)
    }
    setLiveState(next)
  }

  const setPreset = (next: TraceLookbackPreset) => {
    setPresetState(next)
    const nextMs = LOOKBACK_MS[next]
    if (!live) {
      setPausedSince(
        nextMs != null ? sinceIsoFromLookback(nextMs) : undefined,
      )
    } else {
      setPausedSince(undefined)
    }
  }

  return (
    <TraceTimeRangeContext.Provider
      value={{ live, preset, lookbackMs, pausedSince, setLive, setPreset }}
    >
      {children}
    </TraceTimeRangeContext.Provider>
  )
}

export function useTraceTimeRange(): TraceTimeRangeContextValue {
  const ctx = useContext(TraceTimeRangeContext)
  if (!ctx) {
    throw new Error(
      "useTraceTimeRange must be used within TraceTimeRangeProvider",
    )
  }
  return ctx
}
