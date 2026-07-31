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

const METHOD_FALLBACKS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
]

const DURATION_PRESETS = [">100ms", ">500ms", ">1s", "<100ms"] as const

const ROUTE_PAGE_SIZE = 30

type TraceFacetPanelProps = {
  filters: TraceQueryFilters
  facets: TraceFacets
  isLoading: boolean
  onSetFilter: (key: TraceFilterKey, value: string | null) => void
  onCollapse: () => void
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

  const methods =
    facets.methods.length > 0 ? facets.methods : METHOD_FALLBACKS
  const statuses =
    facets.statuses.length > 0 ? facets.statuses : ["ok", "error"]

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
              key={service}
              label={service}
              title={service}
              selected={isFilterValueSelected(filters, "service", service)}
              onSelect={() => toggle("service", service)}
            />
          ))}
        </TraceFacetSection>

        <TraceFacetSection title="Status" isLoading={isLoading}>
          {statuses.map((status) => (
            <TraceFacetValue
              key={status}
              label={status}
              selected={isFilterValueSelected(filters, "status", status)}
              onSelect={() => toggle("status", status)}
            />
          ))}
        </TraceFacetSection>

        <TraceFacetSection
          title="Method"
          isLoading={isLoading}
          empty={!isLoading && methods.length === 0}
        >
          {methods.map((method) => (
            <TraceFacetValue
              key={method}
              label={
                <HttpMethodBadge method={method} className="text-[10px]" />
              }
              selected={isFilterValueSelected(filters, "method", method)}
              onSelect={() => toggle("method", method)}
            />
          ))}
        </TraceFacetSection>

        <TraceFacetSection
          title="HTTP status"
          isLoading={isLoading}
          empty={!isLoading && facets.httpStatusCodes.length === 0}
        >
          {facets.httpStatusCodes.map((code) => {
            const value = String(code)
            return (
              <TraceFacetValue
                key={code}
                label={
                  <HttpStatusCodeBadge code={code} className="text-[10px]" />
                }
                selected={isFilterValueSelected(
                  filters,
                  "http.status_code",
                  value,
                )}
                onSelect={() => toggle("http.status_code", value)}
              />
            )
          })}
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

        <TraceFacetSection title="Duration" defaultOpen>
          {DURATION_PRESETS.map((preset) => (
            <TraceFacetValue
              key={preset}
              label={preset}
              selected={isFilterValueSelected(filters, "duration", preset)}
              onSelect={() => toggle("duration", preset)}
            />
          ))}
        </TraceFacetSection>
      </div>
    </aside>
  )
}
