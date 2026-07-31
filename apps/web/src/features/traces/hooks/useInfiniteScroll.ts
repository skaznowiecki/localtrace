import { useCallback, useEffect, useRef, useState } from "react"

const DEFAULT_PAGE_SIZE = 30

export function useInfiniteScroll<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + pageSize, items.length))
  }, [items.length, pageSize])

  useEffect(() => {
    const scrollRoot = scrollRef.current
    const sentinel = sentinelRef.current
    if (!scrollRoot || !sentinel) return
    if (visibleCount >= items.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      { root: scrollRoot, rootMargin: "160px" },
    )

    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [loadMore, visibleCount, items.length])

  return {
    visibleItems: items.slice(0, visibleCount),
    hasMore: visibleCount < items.length,
    scrollRef,
    sentinelRef,
  }
}
