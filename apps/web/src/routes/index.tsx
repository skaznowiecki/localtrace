import { createFileRoute, redirect } from "@tanstack/react-router"

import { pickTimeRangeSearch } from "@/features/time-range"

export const Route = createFileRoute("/")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/traces", search: pickTimeRangeSearch(search) })
  },
})
