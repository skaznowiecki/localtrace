import type { SpanVendor } from "@/lib/brand-catalog"
import { BrandIcon } from "./BrandIcon"

type SpanVendorIconProps = {
  vendor: SpanVendor
  className?: string
}

/** Brand mark for a resolved vendor (service badge, waterfall, Overview). */
export function SpanVendorIcon({ vendor, className }: SpanVendorIconProps) {
  return <BrandIcon brand={vendor} className={className} />
}
