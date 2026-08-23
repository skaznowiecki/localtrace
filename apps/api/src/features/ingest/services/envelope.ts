import type { Context } from "hono"
import type { AppEnv } from "@/app-env"
import { log } from "@shared/helpers"
import { store as storeTraces } from "@features/traces"
import { store as storeLogs } from "@features/logs"
import { store as storeMetrics } from "@features/metrics"
import { IngestError } from "../providers/errors"
import type { ResolvedIngestProvider } from "../providers/types"

export async function execute(
  c: Context<AppEnv>,
  provider: ResolvedIngestProvider,
): Promise<string | undefined> {
  if (!provider.parseBatch) {
    throw new IngestError(
      "unsupported_media_type",
      `provider ${provider.id} does not support envelope ingest`,
    )
  }

  const raw = new Uint8Array(await c.req.arrayBuffer())
  const body = provider.decode(raw)
  const batch = await provider.parseBatch(body)

  await storeTraces(c.get("db"), batch.spans)
  await storeLogs(c.get("db"), batch.logs)
  await storeMetrics(c.get("db"), batch.metrics)

  log(
    `ingest batch provider=${provider.id} signal=envelope spans=${batch.spans.length} logs=${batch.logs.length} metrics=${batch.metrics.length}`,
  )

  return batch.eventId
}
