import type { ReactNode } from "react"

export type AttributeValueStrategy = {
  id: string
  match: (value: string) => boolean
  render: (value: string) => ReactNode
}
