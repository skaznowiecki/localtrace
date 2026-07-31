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

import type { TraceFacets } from "../../api/traces.api"
import {
  splitQueryTokens,
  TRACE_FILTER_KEYS,
  type TraceFilterKey,
} from "../../lib/trace-filter"

type Suggestion = {
  id: string
  label: string
  description?: string
  insert: string
}

type TraceFilterBarProps = {
  query: string
  onQueryChange: (next: string) => void
  facets: TraceFacets
}

type ActivePhase =
  | { phase: "key"; key: string }
  | { phase: "value"; key: string; value: string }

const DURATION_SUGGESTIONS = [">100ms", ">500ms", ">1s", "<100ms", "<500ms"]
const METHOD_FALLBACKS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]

function valueSuggestions(
  key: TraceFilterKey | string | null,
  facets: TraceFacets,
  needle: string,
): Suggestion[] {
  if (!key) return []

  const lower = needle.toLowerCase()
  const filterValues = (values: string[]) =>
    values
      .filter((value) => !lower || value.toLowerCase().includes(lower))
      .map((value) => ({
        id: `${key}:${value}`,
        label: value,
        insert: `${key}:${value}`,
      }))

  switch (key) {
    case "service":
      return filterValues(facets.services)
    case "status":
      return filterValues(facets.statuses)
    case "method":
      return filterValues(
        facets.methods.length > 0 ? facets.methods : METHOD_FALLBACKS,
      )
    case "http.status_code":
      return filterValues(facets.httpStatusCodes.map(String))
    case "url":
      return facets.routes
        .filter((route) => !lower || route.value.toLowerCase().includes(lower))
        .map((route) => ({
          id: `url:${route.value}`,
          label: route.value,
          description: `${route.count} ${route.count === 1 ? "trace" : "traces"}`,
          insert: `url:${route.value}`,
        }))
    case "duration":
      return DURATION_SUGGESTIONS.filter(
        (value) => !lower || value.toLowerCase().includes(lower),
      ).map((value) => ({
        id: `duration:${value}`,
        label: value,
        description: "Compare against root duration",
        insert: `duration:${value}`,
      }))
    case "name":
      return needle
        ? [
            {
              id: `name:${needle}`,
              label: needle,
              description: "Contains match on root name",
              insert: `name:${needle}`,
            },
          ]
        : []
    default:
      return []
  }
}

function keySuggestions(needle: string): Suggestion[] {
  const lower = needle.toLowerCase()
  return TRACE_FILTER_KEYS.filter(
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

/** Interpret the in-progress draft (a single token) as key vs value phase. */
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

/**
 * Per-color class bundles for filter chips. Class strings are spelled out in
 * full so Tailwind's scanner picks them up (no dynamic `bg-${x}` names).
 */
const CHIP_COLORS = {
  sky: {
    container: "border-sky-500/30 bg-sky-500/10",
    key: "text-sky-700 dark:text-sky-300/90",
    value: "text-sky-800 dark:text-sky-200",
    remove:
      "text-sky-700/80 hover:bg-sky-500/20 hover:text-sky-800 dark:text-sky-300/80 dark:hover:text-sky-200",
  },
  emerald: {
    container: "border-emerald-500/30 bg-emerald-500/10",
    key: "text-emerald-700 dark:text-emerald-300/90",
    value: "text-emerald-800 dark:text-emerald-200",
    remove:
      "text-emerald-700/80 hover:bg-emerald-500/20 hover:text-emerald-800 dark:text-emerald-300/80 dark:hover:text-emerald-200",
  },
  rose: {
    container: "border-rose-500/30 bg-rose-500/10",
    key: "text-rose-700 dark:text-rose-300/90",
    value: "text-rose-800 dark:text-rose-200",
    remove:
      "text-rose-700/80 hover:bg-rose-500/20 hover:text-rose-800 dark:text-rose-300/80 dark:hover:text-rose-200",
  },
  violet: {
    container: "border-violet-500/30 bg-violet-500/10",
    key: "text-violet-700 dark:text-violet-300/90",
    value: "text-violet-800 dark:text-violet-200",
    remove:
      "text-violet-700/80 hover:bg-violet-500/20 hover:text-violet-800 dark:text-violet-300/80 dark:hover:text-violet-200",
  },
  amber: {
    container: "border-amber-500/30 bg-amber-500/10",
    key: "text-amber-700 dark:text-amber-300/90",
    value: "text-amber-800 dark:text-amber-200",
    remove:
      "text-amber-700/80 hover:bg-amber-500/20 hover:text-amber-800 dark:text-amber-300/80 dark:hover:text-amber-200",
  },
  cyan: {
    container: "border-cyan-500/30 bg-cyan-500/10",
    key: "text-cyan-700 dark:text-cyan-300/90",
    value: "text-cyan-800 dark:text-cyan-200",
    remove:
      "text-cyan-700/80 hover:bg-cyan-500/20 hover:text-cyan-800 dark:text-cyan-300/80 dark:hover:text-cyan-200",
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

/** Pick a color for a chip based on its filter key (status is value-aware). */
function chipColor(key: string, value: string | null): ChipColor {
  switch (key.trim().toLowerCase()) {
    case "service":
      return CHIP_COLORS.sky
    case "status":
      if (value?.toLowerCase() === "ok") return CHIP_COLORS.emerald
      if (value?.toLowerCase() === "error") return CHIP_COLORS.rose
      return CHIP_COLORS.slate
    case "method":
      return CHIP_COLORS.violet
    case "http.status_code":
    case "http_status_code":
    case "status_code":
      return CHIP_COLORS.amber
    case "url":
    case "path":
    case "route":
      return CHIP_COLORS.indigo
    case "duration":
      return CHIP_COLORS.cyan
    case "name":
      return CHIP_COLORS.fuchsia
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

/** A committed filter rendered as a removable token in the search bar. */
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

export function TraceFilterBar({
  query,
  onQueryChange,
  facets,
}: TraceFilterBarProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const blockAutoOpenRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [chips, setChips] = useState<string[]>(() => splitQueryTokens(query))
  const [draft, setDraft] = useState("")

  // Track the last query we emitted so echoes back through the URL don't wipe
  // an in-progress draft the user is still typing.
  const lastEmitted = useRef(query.trim())

  const emitQuery = useCallback(
    (nextChips: string[], nextDraft: string) => {
      const next = joinQuery(nextChips, nextDraft)
      lastEmitted.current = next
      onQueryChange(next)
    },
    [onQueryChange],
  )

  // External query change (e.g. back/forward navigation) → rebuild chips.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed === lastEmitted.current) return
    lastEmitted.current = trimmed
    setChips(splitQueryTokens(query))
    setDraft("")
  }, [query])

  // Debounce free-text typing so `name:` filters update the list as you type.
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
      TRACE_FILTER_KEYS.find(
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

  /** Allow the next focus/type to open suggestions (after an intentional dismiss). */
  const allowAutoOpen = useCallback(() => {
    blockAutoOpenRef.current = false
  }, [])

  const requestOpen = useCallback(() => {
    if (blockAutoOpenRef.current) return
    setOpen(true)
  }, [])

  /**
   * Close the suggestion list. `blur` fully deselects the filter input;
   * `refocus` keeps typing focus without reopening (block stays until the
   * user types / arrows / clicks the bar again).
   */
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

  // Clicking outside the bar (or its portaled popup) must dismiss + blur.
  // Popover outside-press alone is easy to miss with modal={false}.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return

      if (containerRef.current?.contains(target)) return

      const popup = document.querySelector(
        `[data-trace-filter-suggestions="${listId}"]`,
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
      // Skip if this exact filter is already selected.
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
        // A complete `key:value` filter → turn it into a chip and close.
        commitToken(suggestion.insert)
        closeSuggestions({ refocus: true })
        return
      }
      // Picking a key (`method:`) → keep typing the value, stay open.
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
      // Commit a manually typed complete filter (`key:value`) into a chip.
      if (active.phase === "value" && active.value.trim().length > 0) {
        commitToken(draft)
      }
      // Close the list but keep focus so another filter can be typed.
      closeSuggestions({ refocus: true })
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      // Always fully deselect — close suggestions and leave the input.
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
      // Combobox stays open while clicking the input; only dismiss outside/Escape.
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
                    ? "Filter traces — e.g. service:api status:error method:GET"
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
                  // Delay so suggestion clicks fire first.
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
          data-trace-filter-suggestions={listId}
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
                ? "Type a filter key (service, status, method…)"
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
