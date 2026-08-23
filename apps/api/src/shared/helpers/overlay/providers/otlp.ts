import type { Overlay } from "../types"
import { asAttrMap } from "../attrs"

export const otlpOverlay: Overlay = {
  id: "otlp",
  apply: (attrs) => asAttrMap(attrs),
}
