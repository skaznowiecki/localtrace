import { memo } from "react"

import { formatSpanDuration } from "@/lib/utils"

import type { Span, SpanGroupMeta } from "../../types"

type SpanGroupDetailsProps = {
  group: SpanGroupMeta
  onSelectMember: (spanId: string) => void
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-mono text-sm tabular-nums">{value}</span>
    </div>
  )
}

const MemberRow = memo(function MemberRow({
  member,
  onSelect,
}: {
  member: Span
  onSelect: (spanId: string) => void
}) {
  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center gap-3 border-b border-border/40 px-1 py-2 text-left last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onSelect(member.id)}
    >
      <span className="min-w-0 flex-1 truncate text-sm">{member.name}</span>
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
        @{formatSpanDuration(member.startOffsetMs)}
      </span>
      <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums">
        {formatSpanDuration(member.durationMs)}
      </span>
    </button>
  )
})

export function SpanGroupDetails({
  group,
  onSelectMember,
}: SpanGroupDetailsProps) {
  const envelopeStart = Math.min(
    ...group.members.map((m) => m.startOffsetMs),
  )
  const envelopeEnd = Math.max(
    ...group.members.map((m) => m.startOffsetMs + m.durationMs),
  )
  const wallClockMs = Math.max(envelopeEnd - envelopeStart, 0)

  return (
    <div className="flex h-full min-h-0 flex-col border-t bg-background">
      <div className="shrink-0 border-b px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium">
              {group.name}{" "}
              <span className="text-muted-foreground">×{group.count}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Consecutive sibling spans
            </p>
          </div>
          <p className="shrink-0 font-mono text-lg font-semibold tabular-nums">
            {formatSpanDuration(group.totalDurationMs)}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          <Stat label="Count" value={String(group.count)} />
          <Stat
            label="Total"
            value={formatSpanDuration(group.totalDurationMs)}
          />
          <Stat
            label="Avg"
            value={formatSpanDuration(group.avgDurationMs)}
          />
          <Stat
            label="Max"
            value={formatSpanDuration(group.maxDurationMs)}
          />
        </div>
        <p className="mt-3 font-mono text-[11px] text-muted-foreground tabular-nums">
          Wall-clock{" "}
          {formatSpanDuration(wallClockMs)} · starts @{" "}
          {formatSpanDuration(envelopeStart)}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <p className="px-1 pb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Members
        </p>
        {group.members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            onSelect={onSelectMember}
          />
        ))}
      </div>
    </div>
  )
}
