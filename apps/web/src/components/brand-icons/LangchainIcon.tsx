import { cn } from "@/lib/utils"

type LangchainIconProps = {
  className?: string
}

/** Solid chain (Simple Icons LangChain is hollow links — unreadable at 12–20px). */
export function LangchainIcon({ className }: LangchainIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="LangChain"
      className={cn("size-4 shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>LangChain</title>
      <path
        fill="#7FC8FF"
        d="M16.5 1.5a6.5 6.5 0 0 1 0 13 6.5 6.5 0 1 1 0-13zM7.5 9.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z"
      />
    </svg>
  )
}
