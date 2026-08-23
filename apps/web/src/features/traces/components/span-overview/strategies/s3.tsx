import type { SpanOverviewStrategy } from "../types"
import { HttpLikeOverview } from "./http"

export const s3OverviewStrategy: SpanOverviewStrategy = {
  id: "s3",
  match: (span) => span.type === "s3",
  render: (span) => <HttpLikeOverview span={span} title="S3" />,
}
