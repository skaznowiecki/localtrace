import { SearchIcon, XIcon } from "lucide-react"
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import type { FacetValue, LogFacets } from "../../api/logs.api"
import {
  LOG_FILTER_KEYS,
  splitQueryTokens,
  type LogFilterKey,
} from "../../lib/log-filter"

type Suggestion = {
  id: string
  label: string
  description?: string
  insert: string
}

type LogFilterBarProps = {
  query: string
  onQueryChange: (next: string) => void
  facets: LogFacets
}

type ActivePhase =
  | { phase: "key"; key: string }
  | { phase: "value"; key: string; value: string }

function facetSuggestions(
  key: string,
  items: FacetValue[],
  needle: string,
): Suggestion[] {
  const lower = needle.toLowerCase()
  return items
    .filter((item) => !lower || item.value.toLowerCase().includes(lower))
    .map((item) => ({
      id: `${key}:${item.value}`,
      label: item.value,
      description: `${item.count} ${item.count === 1 ? "log" : "logs"}`,
      insert: `${key}:${item.value}`,
    }))
}

function valueSuggestions(
  key: LogFilterKey | string | null,
  facets: LogFacets,
  needle: string,
): Suggestion[] {
  if (!key) return []

  switch (key) {
    case "service":
      return facetSuggestions(key, facets.services, needle)
    case "severity":
      return facetSuggestions(key, facets.severities, needle)
    case "message":
      return needle
        ? [
            {
              id: `message:${needle}`,
              label: needle,
              description: "ILIKE match on message",
              insert: `message:${needle}`,
            },
          ]
        : []
    case "trace":
      return needle
        ? [
            {
              id: `trace:${needle}`,
              label: needle,
              description: "ILIKE match on trace id",
              insert: `trace:${needle}`,
            },
          ]
        : []
    default:
      return []
  }
}

function keySuggestions(needle: string): Suggestion[] {
  const lower = needle.toLowerCase()
  return LOG_FILTER_KEYS.filter(
    (facet) =>
      !lower ||
      facet.key.includes(lower) ||
      facet.label.includes(lower) ||
      facet.description.toLowerCase().includes(lower),
  ).map((facet) => ({
    id: facet.key,
    label: `${facet.key}:`,
    description: facet.description,
    insert: `${facet.key}:`,
  }))
}

function activePhase(draft: string): ActivePhase {
  const colon = draft.indexOf(":")
  if (colon === -1) {
    return { phase: "key", key: draft }
  }
  return {
    phase: "value",
    key: draft.slice(0, colon),
    value: draft.slice(colon + 1),
  }
}

function splitChip(chip: string): { key: string; value: string | null } {
  const colon = chip.indexOf(":")
  if (colon === -1) return { key: chip, value: null }
  return { key: chip.slice(0, colon), value: chip.slice(colon + 1) }
}

type ChipColor = {
  container: string
  key: string
  value: string
  remove: string
}

const CHIP_COLORS = {
  sky: {
    container: "border-sky-500/30 bg-sky-500/10",
    key: "text-sky-700 dark:text-sky-300/90",
    value: "text-sky-800 dark:text-sky-200",
    remove:
      "text-sky-700/80 hover:bg-sky-500/20 hover:text-sky-800 dark:text-sky-300/80 dark:hover:text-sky-200",
  },
  rose: {
    container: "border-rose-500/30 bg-rose-500/10",
    key: "text-rose-700 dark:text-rose-300/90",
    value: "text-rose-800 dark:text-rose-200",
    remove:
      "text-rose-700/80 hover:bg-rose-500/20 hover:text-rose-800 dark:text-rose-300/80 dark:hover:text-rose-200",
  },
  amber: {
    container: "border-amber-500/30 bg-amber-500/10",
    key: "text-amber-700 dark:text-amber-300/90",
    value: "text-amber-800 dark:text-amber-200",
    remove:
      "text-amber-700/80 hover:bg-amber-500/20 hover:text-amber-800 dark:text-amber-300/80 dark:hover:text-amber-200",
  },
  violet: {
    container: "border-violet-500/30 bg-violet-500/10",
    key: "text-violet-700 dark:text-violet-300/90",
    value: "text-violet-800 dark:text-violet-200",
    remove:
      "text-violet-700/80 hover:bg-violet-500/20 hover:text-violet-800 dark:text-violet-300/80 dark:hover:text-violet-200",
  },
  fuchsia: {
    container: "border-fuchsia-500/30 bg-fuchsia-500/10",
    key: "text-fuchsia-700 dark:text-fuchsia-300/90",
    value: "text-fuchsia-800 dark:text-fuchsia-200",
    remove:
      "text-fuchsia-700/80 hover:bg-fuchsia-500/20 hover:text-fuchsia-800 dark:text-fuchsia-300/80 dark:hover:text-fuchsia-200",
  },
  indigo: {
    container: "border-indigo-500/30 bg-indigo-500/10",
    key: "text-indigo-700 dark:text-indigo-300/90",
    value: "text-indigo-800 dark:text-indigo-200",
    remove:
      "text-indigo-700/80 hover:bg-indigo-500/20 hover:text-indigo-800 dark:text-indigo-300/80 dark:hover:text-indigo-200",
  },
  slate: {
    container: "border-slate-500/30 bg-slate-500/10",
    key: "text-slate-600 dark:text-slate-300/90",
    value: "text-slate-800 dark:text-slate-200",
    remove:
      "text-slate-600/80 hover:bg-slate-500/20 hover:text-slate-800 dark:text-slate-300/80 dark:hover:text-slate-200",
  },
} as const satisfies Record<string, ChipColor>

function chipColor(key: string, value: string | null): ChipColor {
  switch (key.trim().toLowerCase()) {
    case "service":
      return CHIP_COLORS.sky
    case "severity":
    case "level": {
      const severity = value?.toLowerCase() ?? ""
      if (severity.includes("error") || severity.includes("fatal")) {
        return CHIP_COLORS.rose
      }
      if (severity.includes("warn")) return CHIP_COLORS.amber
      if (severity.includes("debug") || severity.includes("trace")) {
        return CHIP_COLORS.violet
      }
      return CHIP_COLORS.sky
    }
    case "body":
    case "message":
      return CHIP_COLORS.fuchsia
    case "trace":
    case "trace_id":
      return CHIP_COLORS.indigo
    default:
      return CHIP_COLORS.slate
  }
}

function joinQuery(chips: string[], draft: string): string {
  return [...chips, draft]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" ")
}

function FilterChip({
  chip,
  onRemove,
}: {
  chip: string
  onRemove: () => void
}) {
  const { key, value } = splitChip(chip)
  const color = chipColor(key, value)
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-lg border py-1 pr-1 pl-2.5 font-mono text-xs leading-none",
        color.container,
      )}
    >
      <span className={color.key}>{key}</span>
      {value !== null ? (
        <>
          <span className={cn(color.key, "opacity-60")}>:</span>
          <span className={cn("font-medium", color.value)}>{value}</span>
        </>
      ) : null}
      <button
        type="button"
        aria-label={`Remove ${chip} filter`}
        className={cn(
          "ml-0.5 flex size-5 cursor-pointer items-center justify-center rounded-md transition-colors",
          color.remove,
        )}
        onMouseDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onRemove()
        }}
      >
        <XIcon className="size-3.5" />
      </button>
    </span>
  )
}

export function LogFilterBar({
  query,
  onQueryChange,
  facets,
}: LogFilterBarProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const blockAutoOpenRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [chips, setChips] = useState<string[]>(() => splitQueryTokens(query))
  const [draft, setDraft] = useState("")
  const lastEmitted = useRef(query.trim())

  const emitQuery = useCallback(
    (nextChips: string[], nextDraft: string) => {
      const next = joinQuery(nextChips, nextDraft)
      lastEmitted.current = next
      onQueryChange(next)
    },
    [onQueryChange],
  )

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed === lastEmitted.current) return
    lastEmitted.current = trimmed
    setChips(splitQueryTokens(query))
    setDraft("")
  }, [query])

  useEffect(() => {
    const next = joinQuery(chips, draft)
    if (next === lastEmitted.current) return
    const handle = window.setTimeout(() => emitQuery(chips, draft), 250)
    return () => window.clearTimeout(handle)
  }, [chips, draft, emitQuery])

  const active = useMemo(() => activePhase(draft), [draft])

  const suggestions = useMemo(() => {
    const selected = new Set(chips.map((chip) => chip.toLowerCase()))
    if (active.phase === "key") {
      return keySuggestions(active.key)
    }
    const normalizedKey =
      LOG_FILTER_KEYS.find(
        (facet) => facet.key === active.key.toLowerCase(),
      )?.key ?? active.key
    return valueSuggestions(normalizedKey, facets, active.value).filter(
      (suggestion) => !selected.has(suggestion.insert.toLowerCase()),
    )
  }, [active, chips, facets])

  useEffect(() => {
    setHighlight(0)
  }, [suggestions])

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const allowAutoOpen = useCallback(() => {
    blockAutoOpenRef.current = false
  }, [])

  const requestOpen = useCallback(() => {
    if (blockAutoOpenRef.current) return
    setOpen(true)
  }, [])

  const closeSuggestions = useCallback(
    (options?: { refocus?: boolean; blur?: boolean }) => {
      blockAutoOpenRef.current = true
      setOpen(false)
      if (options?.blur) {
        inputRef.current?.blur()
        return
      }
      if (options?.refocus) {
        requestAnimationFrame(() => inputRef.current?.focus())
      }
    },
    [],
  )

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return

      if (containerRef.current?.contains(target)) return

      const popup = document.querySelector(
        `[data-log-filter-suggestions="${listId}"]`,
      )
      if (popup?.contains(target)) return

      closeSuggestions({ blur: true })
    }

    document.addEventListener("pointerdown", onPointerDown, true)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true)
    }
  }, [open, closeSuggestions, listId])

  const removeChip = useCallback(
    (index: number) => {
      const nextChips = chips.filter((_, i) => i !== index)
      setChips(nextChips)
      emitQuery(nextChips, draft)
      allowAutoOpen()
      focusInput()
    },
    [allowAutoOpen, chips, draft, emitQuery, focusInput],
  )

  const commitToken = useCallback(
    (token: string) => {
      const trimmed = token.trim()
      if (!trimmed) return
      const alreadySelected = chips.some(
        (chip) => chip.toLowerCase() === trimmed.toLowerCase(),
      )
      if (alreadySelected) {
        setDraft("")
        emitQuery(chips, "")
        return
      }
      const nextChips = [...chips, trimmed]
      setChips(nextChips)
      setDraft("")
      emitQuery(nextChips, "")
    },
    [chips, emitQuery],
  )

  const applySuggestion = useCallback(
    (suggestion: Suggestion) => {
      if (active.phase === "value") {
        commitToken(suggestion.insert)
        closeSuggestions({ refocus: true })
        return
      }
      allowAutoOpen()
      setDraft(suggestion.insert)
      requestOpen()
      focusInput()
    },
    [
      active.phase,
      allowAutoOpen,
      closeSuggestions,
      commitToken,
      focusInput,
      requestOpen,
    ],
  )

  const clearAll = useCallback(() => {
    setChips([])
    setDraft("")
    emitQuery([], "")
    allowAutoOpen()
    focusInput()
  }, [allowAutoOpen, emitQuery, focusInput])

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      allowAutoOpen()
      if (!open) {
        requestOpen()
        return
      }
      if (suggestions.length === 0) return
      event.preventDefault()
      setHighlight((index) => (index + 1) % suggestions.length)
      return
    }

    if (event.key === "ArrowUp") {
      if (!open || suggestions.length === 0) return
      event.preventDefault()
      setHighlight(
        (index) => (index - 1 + suggestions.length) % suggestions.length,
      )
      return
    }

    if (event.key === "Enter") {
      if (open && suggestions[highlight]) {
        event.preventDefault()
        applySuggestion(suggestions[highlight]!)
        return
      }
      event.preventDefault()
      if (active.phase === "value" && active.value.trim().length > 0) {
        commitToken(draft)
      }
      closeSuggestions({ refocus: true })
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      closeSuggestions({ blur: true })
      return
    }

    if (event.key === "Tab" && open && suggestions[highlight]) {
      event.preventDefault()
      applySuggestion(suggestions[highlight]!)
      return
    }

    if (
      event.key === "Backspace" &&
      draft.length === 0 &&
      chips.length > 0 &&
      (event.currentTarget.selectionStart ?? 0) === 0
    ) {
      event.preventDefault()
      removeChip(chips.length - 1)
    }
  }

  const hasContent = chips.length > 0 || draft.length > 0

  const handleOpenChange = useCallback(
    (nextOpen: boolean, eventDetails?: { reason?: string }) => {
      if (!nextOpen && eventDetails?.reason === "trigger-press") {
        return
      }

      if (!nextOpen) {
        closeSuggestions({ blur: true })
        return
      }

      allowAutoOpen()
      requestOpen()
    },
    [allowAutoOpen, closeSuggestions, requestOpen],
  )

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <div className="relative min-w-0 flex-1">
        <PopoverTrigger
          nativeButton={false}
          render={
            <div
              ref={containerRef}
              className={cn(
                "flex min-h-11 w-full min-w-0 flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 py-1.5 pr-2.5 pl-3 shadow-xs transition-[color,background-color,box-shadow] duration-200",
                "focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/30",
              )}
              onClick={() => {
                allowAutoOpen()
                inputRef.current?.focus()
                requestOpen()
              }}
            >
              <SearchIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
              {chips.map((chip, index) => (
                <FilterChip
                  key={`${chip}-${index}`}
                  chip={chip}
                  onRemove={() => removeChip(index)}
                />
              ))}
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                  open && suggestions[highlight]
                    ? `${listId}-${suggestions[highlight]!.id}`
                    : undefined
                }
                value={draft}
                placeholder={
                  chips.length === 0
                    ? "Filter logs — e.g. service:api severity:ERROR message:timeout trace:ab12"
                    : ""
                }
                className="h-7 min-w-28 flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground"
                onFocus={requestOpen}
                onKeyDown={onKeyDown}
                onChange={(event) => {
                  allowAutoOpen()
                  setDraft(event.target.value)
                  requestOpen()
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    if (active.phase === "value" && active.value.trim()) {
                      commitToken(draft)
                    }
                  }, 120)
                }}
              />
              {hasContent ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="ml-auto size-7 shrink-0 cursor-pointer"
                  aria-label="Clear filters"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation()
                    clearAll()
                  }}
                >
                  <XIcon />
                </Button>
              ) : null}
            </div>
          }
        />

        <PopoverContent
          anchor={containerRef}
          align="start"
          side="bottom"
          sideOffset={6}
          className="w-72 max-w-[calc(100vw-2rem)] gap-1 p-1.5"
          initialFocus={false}
          data-log-filter-suggestions={listId}
        >
          <PopoverHeader className="sr-only">
            <PopoverTitle>Filter suggestions</PopoverTitle>
            <PopoverDescription>
              Choose a filter key or value to add it to the query.
            </PopoverDescription>
          </PopoverHeader>

          {suggestions.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">
              {active.phase === "key"
                ? "Type a filter key (service, severity, message…)"
                : "No matching values"}
            </p>
          ) : (
            <ul
              id={listId}
              role="listbox"
              className="flex max-h-64 flex-col gap-0.5 overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => (
                <li key={suggestion.id} role="presentation">
                  <button
                    type="button"
                    id={`${listId}-${suggestion.id}`}
                    role="option"
                    aria-selected={index === highlight}
                    className={cn(
                      "flex w-full cursor-pointer items-start justify-between gap-3 rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors",
                      index === highlight
                        ? "bg-muted text-foreground"
                        : "text-foreground hover:bg-muted/60",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => applySuggestion(suggestion)}
                  >
                    <span className="font-mono font-medium">
                      {suggestion.label}
                    </span>
                    {suggestion.description ? (
                      <span className="truncate text-[11px] text-muted-foreground">
                        {suggestion.description}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </div>
    </Popover>
  )
}
