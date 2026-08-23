import { useEffect, useRef } from "react"

export function useLoadMoreOnScroll(options: {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}) {
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = options
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = scrollRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return
    if (!hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage()
      },
      { root, rootMargin: "240px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return { scrollRef, sentinelRef }
}
