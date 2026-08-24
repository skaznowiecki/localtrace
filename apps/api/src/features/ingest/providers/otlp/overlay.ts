import { asAttrMap, type Overlay } from "../overlay-attrs"

export const otlpOverlay: Overlay = {
  id: "otlp",
  apply: (attrs) => asAttrMap(attrs),
}
