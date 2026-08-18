import type { Json } from "../../../shared/helpers"

export type MetricDataPoint = {
  id: string
  name: string
  description?: string
  unit?: string
  metricType: number
  aggregationTemporality?: number
  isMonotonic?: boolean
  metadata: Json
  serviceName: string
  resourceAttributes: Json
  resourceDroppedAttributesCount: number
  resourceSchemaUrl?: string
  scopeName?: string
  scopeVersion?: string
  scopeAttributes: Json
  scopeDroppedAttributesCount: number
  scopeSchemaUrl?: string
  attributes: Json
  startTimeNs?: bigint
  timeNs: bigint
  valueDouble?: number
  intValue?: bigint
  count?: bigint
  sum?: number
  min?: number
  max?: number
  exemplars: Json
  flags: number
  data: Json
}
