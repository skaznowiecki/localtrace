import { BlocksIcon } from "lucide-react"

import { resolveBrandFromName } from "../../lib/span-vendor"
import { getServiceColor } from "../../service-colors"
import { SpanVendorIcon } from "./brand-icons"

type ServiceBadgeProps = {
  service: string
}

export function ServiceBadge({ service }: ServiceBadgeProps) {
  const brand = resolveBrandFromName(service)
  const color = getServiceColor(service)

  return (
    <span className="inline-flex items-center gap-2">
      {brand ? (
        <SpanVendorIcon vendor={brand} className="size-4" />
      ) : (
        <span
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm"
          style={{ backgroundColor: color }}
        >
          <BlocksIcon className="size-2.5 text-white" />
        </span>
      )}
      <span className="text-foreground">{service}</span>
    </span>
  )
}
