import { useCallback, useRef, useState } from "react"

type UseResizablePanelOptions = {
  initialFraction?: number
  minFraction?: number
  maxFraction?: number
}

export function useResizablePanel({
  initialFraction = 0.4,
  minFraction = 0.15,
  maxFraction = 0.8,
}: UseResizablePanelOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fraction, setFraction] = useState(initialFraction)
  const [isDragging, setIsDragging] = useState(false)

  const onDragStart = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault()
      setIsDragging(true)

      const handleMove = (moveEvent: PointerEvent) => {
        const container = containerRef.current
        if (!container) return
        const rect = container.getBoundingClientRect()
        if (rect.height <= 0) return
        const next = (rect.bottom - moveEvent.clientY) / rect.height
        setFraction(Math.min(maxFraction, Math.max(minFraction, next)))
      }

      const handleUp = () => {
        setIsDragging(false)
        window.removeEventListener("pointermove", handleMove)
        window.removeEventListener("pointerup", handleUp)
      }

      window.addEventListener("pointermove", handleMove)
      window.addEventListener("pointerup", handleUp)
    },
    [minFraction, maxFraction],
  )

  return { containerRef, fraction, isDragging, onDragStart }
}
