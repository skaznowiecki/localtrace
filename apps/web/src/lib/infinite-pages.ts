export const LIST_PAGE_SIZE = 50

export function flattenUniqueById<T extends { id: string }>(
  pages: T[][] | undefined,
): T[] {
  if (!pages) return []
  const seen = new Set<string>()
  const items: T[] = []
  for (const page of pages) {
    for (const item of page) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      items.push(item)
    }
  }
  return items
}

export function prependUniqueById<T extends { id: string }>(
  pages: T[][],
  head: T[],
): T[][] {
  if (pages.length === 0) return [head]
  const seen = new Set<string>()
  for (const page of pages) {
    for (const item of page) seen.add(item.id)
  }
  const fresh = head.filter((item) => !seen.has(item.id))
  if (fresh.length === 0) return pages
  return [[...fresh, ...pages[0]!], ...pages.slice(1)]
}

export function nextPageOffset<T>(
  lastPage: T[],
  allPages: T[][],
  pageSize: number,
): number | undefined {
  if (lastPage.length < pageSize) return undefined
  return allPages.reduce((sum, page) => sum + page.length, 0)
}
