import { cn } from "@/lib/utils"

import { BRANDS, type SpanVendor } from "../../../lib/brand-catalog"
import { MemcachedIcon } from "./MemcachedIcon"

type BrandIconProps = {
  brand: SpanVendor
  className?: string
}

function isDarkHex(hex: string): boolean {
  const n = Number.parseInt(hex.replace("#", ""), 16)
  if (!Number.isFinite(n)) return false
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.2
}

export function BrandIcon({ brand, className }: BrandIconProps) {
  if (brand === "memcached") {
    return <MemcachedIcon className={className} />
  }

  const { glyph } = BRANDS[brand]
  const invert = isDarkHex(glyph.hex)

  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={glyph.title}
      className={cn("size-4 shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{glyph.title}</title>
      <path
        fill={`#${glyph.hex}`}
        className={invert ? "dark:fill-slate-100" : undefined}
        d={glyph.path}
      />
    </svg>
  )
}
