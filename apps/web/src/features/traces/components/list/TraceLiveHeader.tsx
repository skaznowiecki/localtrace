import { TraceLiveControls } from "./TraceLiveControls"
import { useTraceTimeRange } from "../../hooks/useTraceTimeRange"

/** Wires LIVE/lookback controls for the app header (same row as Trazas/Logs). */
export function TraceLiveHeader() {
  const { live, preset, setLive, setPreset } = useTraceTimeRange()

  return (
    <TraceLiveControls
      live={live}
      onLiveChange={setLive}
      preset={preset}
      onPresetChange={setPreset}
    />
  )
}
