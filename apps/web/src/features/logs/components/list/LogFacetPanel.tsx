import { PanelLeftCloseIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ServiceBadge } from "@/components/ServiceBadge"
import { FacetSection } from "@/components/ui/facet-section"
import { FacetValue } from "@/components/ui/facet-value"

import type { LogFacets } from "../../api/logs.api"
import {
  isFilterValueSelected,
  type LogFilterKey,
  type LogQueryFilters,
} from "../../lib/log-filter"
import { SeverityBadge } from "../display/SeverityBadge"

type LogFacetPanelProps = {
  filters: LogQueryFilters
  facets: LogFacets
  isLoading: boolean
  onSetFilter: (key: LogFilterKey, value: string | null) => void
  onCollapse: () => void
}

function TextFilter({
  filterKey,
  value,
  placeholder,
  ariaLabel,
  onSetFilter,
}: {
  filterKey: LogFilterKey
  value: string
  placeholder: string
  ariaLabel: string
  onSetFilter: (key: LogFilterKey, next: string | null) => void
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const trimmed = draft.trim()
      const next = trimmed.length > 0 ? trimmed : null
      const current = value.trim().length > 0 ? value : null
      if (next === current) return
      onSetFilter(filterKey, next)
    }, 250)
    return () => window.clearTimeout(handle)
  }, [draft, filterKey, onSetFilter, value])

  return (
    <Input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      placeholder={placeholder}
      className="h-7 font-mono text-xs"
      aria-label={ariaLabel}
    />
  )
}

export function LogFacetPanel({
  filters,
  facets,
  isLoading,
  onSetFilter,
  onCollapse,
}: LogFacetPanelProps) {
  const toggle = (key: LogFilterKey, value: string) => {
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
        <FacetSection title="Message" empty={false}>
          <TextFilter
            filterKey="message"
            value={filters.message ?? ""}
            placeholder=""
            ariaLabel="Filter by message"
            onSetFilter={onSetFilter}
          />
        </FacetSection>

        <FacetSection title="Trace ID" empty={false}>
          <TextFilter
            filterKey="trace"
            value={filters.traceId ?? ""}
            placeholder=""
            ariaLabel="Filter by trace id"
            onSetFilter={onSetFilter}
          />
        </FacetSection>

        <FacetSection
          title="Service"
          isLoading={isLoading}
          empty={!isLoading && facets.services.length === 0}
        >
          {facets.services.map((service) => (
            <FacetValue
              key={service.value}
              label={<ServiceBadge service={service.value} />}
              title={service.value}
              count={service.count}
              selected={isFilterValueSelected(filters, "service", service.value)}
              onSelect={() => toggle("service", service.value)}
            />
          ))}
        </FacetSection>

        <FacetSection
          title="Severity"
          isLoading={isLoading}
          empty={!isLoading && facets.severities.length === 0}
        >
          {facets.severities.map((severity) => (
            <FacetValue
              key={severity.value}
              label={<SeverityBadge label={severity.value} />}
              count={severity.count}
              selected={isFilterValueSelected(
                filters,
                "severity",
                severity.value,
              )}
              onSelect={() => toggle("severity", severity.value)}
            />
          ))}
        </FacetSection>
      </div>
    </aside>
  )
}
