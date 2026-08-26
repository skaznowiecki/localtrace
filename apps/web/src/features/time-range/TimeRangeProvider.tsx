import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router"
import { createContext, useContext, useEffect, type ReactNode } from "react"

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

export type TimeRangeSearch = {
  live?: false
  lookback?: Exclude<LookbackPreset, "latest">
  since?: string
}

function isLookbackParam(
  value: unknown,
): value is Exclude<LookbackPreset, "latest"> {
  return value === "15m" || value === "1h" || value === "6h"
}

/** Root search: omit defaults so Latest + LIVE stays a clean URL. */
export function parseTimeRangeSearch(
  search: Record<string, unknown>,
): TimeRangeSearch {
  const result: TimeRangeSearch = {}
  if (
    search.live === false ||
    search.live === "false" ||
    search.live === "0"
  ) {
    result.live = false
  }
  if (isLookbackParam(search.lookback)) {
    result.lookback = search.lookback
  }
  if (typeof search.since === "string" && search.since.length > 0) {
    result.since = search.since
  }
  return result
}

export function pickTimeRangeSearch(search: TimeRangeSearch): TimeRangeSearch {
  return parseTimeRangeSearch(search)
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
 * Synced to the URL (`live`, `lookback`, `since`) so reload keeps the selection.
 */
export function TimeRangeProvider({ children }: { children: ReactNode }) {
  const navigateTraces = useNavigate({ from: "/traces" })
  const navigateLogs = useNavigate({ from: "/logs" })
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const search = useSearch({ from: "__root__" })
  const live = search.live !== false
  const preset: LookbackPreset = search.lookback ?? "latest"
  const lookbackMs = LOOKBACK_MS[preset]
  const pausedSince = live ? undefined : search.since
  const onLogs = pathname.startsWith("/logs")

  const patchSearch = (next: {
    live: boolean
    preset: LookbackPreset
    pausedSince: string | undefined
  }) => {
    const patch: TimeRangeSearch = {
      live: next.live ? undefined : false,
      lookback: next.preset === "latest" ? undefined : next.preset,
      since:
        next.live || next.pausedSince == null ? undefined : next.pausedSince,
    }
    if (onLogs) {
      void navigateLogs({
        search: (prev) => ({ ...prev, ...patch }),
        replace: true,
      })
    } else {
      void navigateTraces({
        search: (prev) => ({ ...prev, ...patch }),
        replace: true,
      })
    }
  }

  useEffect(() => {
    if (live || lookbackMs == null || pausedSince != null) return
    patchSearch({
      live,
      preset,
      pausedSince: sinceIsoFromLookback(lookbackMs),
    })
  }, [live, lookbackMs, onLogs, pausedSince, preset])

  const setLive = (next: boolean) => {
    const nextSince =
      !next && lookbackMs != null ? sinceIsoFromLookback(lookbackMs) : undefined
    patchSearch({ live: next, preset, pausedSince: nextSince })
  }

  const setPreset = (next: LookbackPreset) => {
    const nextMs = LOOKBACK_MS[next]
    const nextSince =
      !live && nextMs != null ? sinceIsoFromLookback(nextMs) : undefined
    patchSearch({ live, preset: next, pausedSince: nextSince })
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
