import { useTimeRange } from "../TimeRangeProvider"
import { LiveControls } from "./LiveControls"

/** Wires LIVE/lookback controls for the app header (same row as Trazas/Logs). */
export function LiveHeader() {
  const { live, preset, setLive, setPreset } = useTimeRange()

  return (
    <LiveControls
      live={live}
      onLiveChange={setLive}
      preset={preset}
      onPresetChange={setPreset}
    />
  )
}
