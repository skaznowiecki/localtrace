import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react"

export type LookbackPreset = "latest" | "15m" | "1h" | "6h"

export const LOOKBACK_PRESETS: Array<{
  id: LookbackPreset
  label: string
  lookbackMs: number | null
}> = [
  { id: "latest", label: "Latest", lookbackMs: null },
  { id: "15m", label: "Last 15m", lookbackMs: 15 * 60_000 },
  { id: "1h", label: "Last 1h", lookbackMs: 60 * 60_000 },
  { id: "6h", label: "Last 6h", lookbackMs: 6 * 60 * 60_000 },
]

const LOOKBACK_MS: Record<LookbackPreset, number | null> = {
  latest: null,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "6h": 6 * 60 * 60_000,
}

function sinceIsoFromLookback(lookbackMs: number): string {
  return new Date(Date.now() - lookbackMs).toISOString()
}

type TimeRangeContextValue = {
  live: boolean
  preset: LookbackPreset
  lookbackMs: number | null
  /** Absolute since when paused; ignored while LIVE (sliding window in queryFn). */
  pausedSince: string | undefined
  setLive: (live: boolean) => void
  setPreset: (preset: LookbackPreset) => void
}

const TimeRangeContext = createContext<TimeRangeContextValue | null>(null)

/**
 * LIVE polling + short relative lookback for list views.
 * Shared between the app header controls and list queries.
 * State is in-memory only — not synced to the URL.
 */
export function TimeRangeProvider({ children }: { children: ReactNode }) {
  const [live, setLiveState] = useState(true)
  const [preset, setPresetState] = useState<LookbackPreset>("latest")
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

  const setPreset = (next: LookbackPreset) => {
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
    <TimeRangeContext.Provider
      value={{ live, preset, lookbackMs, pausedSince, setLive, setPreset }}
    >
      {children}
    </TimeRangeContext.Provider>
  )
}

export function useTimeRange(): TimeRangeContextValue {
  const ctx = useContext(TimeRangeContext)
  if (!ctx) {
    throw new Error("useTimeRange must be used within TimeRangeProvider")
  }
  return ctx
}
