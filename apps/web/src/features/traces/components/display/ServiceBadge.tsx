import { BlocksIcon } from "lucide-react"

import { getServiceColor } from "../../service-colors"

type ServiceBadgeProps = {
  service: string
}

export function ServiceBadge({ service }: ServiceBadgeProps) {
  const color = getServiceColor(service)

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm"
        style={{ backgroundColor: color }}
      >
        <BlocksIcon className="size-2.5 text-white" />
      </span>
      <span className="text-foreground">{service}</span>
    </span>
  )
}
