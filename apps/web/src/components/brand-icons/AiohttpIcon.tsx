import { cn } from "@/lib/utils"

type AiohttpIconProps = {
  className?: string
}

/** Solid 3-node cluster (Simple Icons aiohttp is a hollow hub — unreadable at 12–20px). */
export function AiohttpIcon({ className }: AiohttpIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="aiohttp"
      className={cn("size-4 shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>aiohttp</title>
      <g fill="#2C5BB4">
        <circle cx="12" cy="6.25" r="4.25" />
        <circle cx="6.6" cy="16.35" r="4.25" />
        <circle cx="17.4" cy="16.35" r="4.25" />
      </g>
    </svg>
  )
}
