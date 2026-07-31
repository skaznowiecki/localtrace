import { QueryClient } from "@tanstack/react-query"

/**
 * Shared React Query client for the app.
 *
 * Defaults are tuned for a local telemetry UI: data is cheap to refetch and
 * changes frequently as new spans/logs arrive, so we keep a short `staleTime`
 * and refetch when the window regains focus.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})
