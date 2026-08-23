import { PanelLeftCloseIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import type { TraceFacets } from "../../api/traces.api"
import {
  isFilterValueSelected,
  type TraceFilterKey,
  type TraceQueryFilters,
} from "../../lib/trace-filter"
import { HttpMethodBadge } from "../display/HttpMethodBadge"
import { HttpStatusCodeBadge } from "../display/HttpStatusCodeBadge"
import { TraceFacetSection } from "./TraceFacetSection"
import { TraceFacetValue } from "./TraceFacetValue"

const ROUTE_PAGE_SIZE = 30

type TraceFacetPanelProps = {
  filters: TraceQueryFilters
  facets: TraceFacets
  isLoading: boolean
  onSetFilter: (key: TraceFilterKey, value: string | null) => void
  onCollapse: () => void
}

function durationLabel(value: string): string {
  if (value.startsWith(">")) return value
  return value.replace("-", "–")
}

export function TraceFacetPanel({
  filters,
  facets,
  isLoading,
  onSetFilter,
  onCollapse,
}: TraceFacetPanelProps) {
  const [routeNeedle, setRouteNeedle] = useState("")
  const [routeLimit, setRouteLimit] = useState(ROUTE_PAGE_SIZE)

  const filteredRoutes = useMemo(() => {
    const lower = routeNeedle.trim().toLowerCase()
    if (!lower) return facets.routes
    return facets.routes.filter((route) =>
      route.value.toLowerCase().includes(lower),
    )
  }, [facets.routes, routeNeedle])

  const visibleRoutes = filteredRoutes.slice(0, routeLimit)
  const hasMoreRoutes = filteredRoutes.length > routeLimit

  const toggle = (key: TraceFilterKey, value: string) => {
    if (isFilterValueSelected(filters, key, value)) {
      onSetFilter(key, null)
    } else {
      onSetFilter(key, value)
    }
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-background">
      <div className="flex h-[45px] shrink-0 items-center justify-between gap-2 border-b px-3">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Filters
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="cursor-pointer"
          aria-label="Collapse filters"
          onClick={onCollapse}
        >
          <PanelLeftCloseIcon className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <TraceFacetSection
          title="Service"
          isLoading={isLoading}
          empty={!isLoading && facets.services.length === 0}
        >
          {facets.services.map((service) => (
            <TraceFacetValue
              key={service.value}
              label={service.value}
              title={service.value}
              count={service.count}
              selected={isFilterValueSelected(filters, "service", service.value)}
              onSelect={() => toggle("service", service.value)}
            />
          ))}
        </TraceFacetSection>

        <TraceFacetSection
          title="Status"
          isLoading={isLoading}
          empty={!isLoading && facets.statuses.length === 0}
        >
          {facets.statuses.map((status) => (
            <TraceFacetValue
              key={status.value}
              label={status.value}
              count={status.count}
              selected={isFilterValueSelected(filters, "status", status.value)}
              onSelect={() => toggle("status", status.value)}
            />
          ))}
        </TraceFacetSection>

        <TraceFacetSection
          title="Method"
          isLoading={isLoading}
          empty={!isLoading && facets.methods.length === 0}
        >
          {facets.methods.map((method) => (
            <TraceFacetValue
              key={method.value}
              label={
                <HttpMethodBadge method={method.value} className="text-[10px]" />
              }
              count={method.count}
              selected={isFilterValueSelected(filters, "method", method.value)}
              onSelect={() => toggle("method", method.value)}
            />
          ))}
        </TraceFacetSection>

        <TraceFacetSection
          title="HTTP status"
          isLoading={isLoading}
          empty={!isLoading && facets.httpStatusCodes.length === 0}
        >
          {facets.httpStatusCodes.map((code) => (
            <TraceFacetValue
              key={code.value}
              label={
                <HttpStatusCodeBadge
                  code={code.value}
                  className="text-[10px]"
                />
              }
              count={code.count}
              selected={isFilterValueSelected(
                filters,
                "http.status_code",
                code.value,
              )}
              onSelect={() => toggle("http.status_code", code.value)}
            />
          ))}
        </TraceFacetSection>

        <TraceFacetSection
          title="Route"
          isLoading={isLoading}
          empty={!isLoading && facets.routes.length === 0}
          headerExtra={
            facets.routes.length > 8 ? (
              <Input
                value={routeNeedle}
                onChange={(event) => {
                  setRouteNeedle(event.target.value)
                  setRouteLimit(ROUTE_PAGE_SIZE)
                }}
                placeholder="Filter routes…"
                className="h-7 text-xs"
              />
            ) : null
          }
        >
          {visibleRoutes.map((route) => (
            <TraceFacetValue
              key={route.value}
              label={route.value}
              title={route.value}
              count={route.count}
              selected={isFilterValueSelected(filters, "url", route.value)}
              onSelect={() => toggle("url", route.value)}
            />
          ))}
          {hasMoreRoutes ? (
            <button
              type="button"
              className="mt-1 w-full cursor-pointer rounded-md px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              onClick={() => setRouteLimit((n) => n + ROUTE_PAGE_SIZE)}
            >
              Show more ({filteredRoutes.length - routeLimit} left)
            </button>
          ) : null}
        </TraceFacetSection>

        <TraceFacetSection
          title="Duration"
          defaultOpen
          isLoading={isLoading}
          empty={!isLoading && facets.durations.length === 0}
        >
          {facets.durations.map((bucket) => (
            <TraceFacetValue
              key={bucket.value}
              label={durationLabel(bucket.value)}
              count={bucket.count}
              selected={isFilterValueSelected(
                filters,
                "duration",
                bucket.value,
              )}
              onSelect={() => toggle("duration", bucket.value)}
            />
          ))}
        </TraceFacetSection>
      </div>
    </aside>
  )
}
