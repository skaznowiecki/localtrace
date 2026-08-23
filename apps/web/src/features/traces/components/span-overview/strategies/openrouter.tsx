import type { SpanOverviewStrategy } from "../types"
import { HttpLikeOverview } from "./http"

export const openrouterOverviewStrategy: SpanOverviewStrategy = {
  id: "openrouter",
  match: (span) => span.type === "openrouter",
  render: (span) => <HttpLikeOverview span={span} title="OpenRouter" />,
}
