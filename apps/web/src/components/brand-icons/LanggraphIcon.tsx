import { cn } from "@/lib/utils"

type LanggraphIconProps = {
  className?: string
}

/** Solid 2×2 nodes (Simple Icons LangGraph is a hollow frame — unreadable at 12–20px). */
export function LanggraphIcon({ className }: LanggraphIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="LangGraph"
      className={cn("size-4 shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>LangGraph</title>
      <g fill="#7FC8FF">
        <rect x="1.5" y="1.5" width="9" height="9" rx="2.5" />
        <rect x="13.5" y="1.5" width="9" height="9" rx="2.5" />
        <rect x="1.5" y="13.5" width="9" height="9" rx="2.5" />
        <rect x="13.5" y="13.5" width="9" height="9" rx="2.5" />
      </g>
    </svg>
  )
}
