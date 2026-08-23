import type { Overlay } from "../types"
import { datadogOverlay } from "./datadog"
import { otlpOverlay } from "./otlp"
import { sentryOverlay } from "./sentry"

export const overlays: Overlay[] = [otlpOverlay, sentryOverlay, datadogOverlay]

export { otlpOverlay }
