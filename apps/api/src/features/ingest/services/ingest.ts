import type { Context } from "hono"
import type { AppEnv } from "@/app-env"
import { log, stampIngestProvider } from "@shared/helpers"
import { store as storeTraces } from "@features/traces"
import { store as storeLogs } from "@features/logs"
import { store as storeMetrics } from "@features/metrics"
import type { ResolvedIngestProvider } from "../providers/types"

export async function ingestTraces(
  c: Context<AppEnv>,
  provider: ResolvedIngestProvider,
): Promise<void> {
  const raw = new Uint8Array(await c.req.arrayBuffer())
  const body = provider.decode(raw)
  const spans = stampIngestProvider(await provider.parseTraces(body), provider.id)
  await storeTraces(c.get("db"), spans)
  log(`ingest batch provider=${provider.id} signal=traces count=${spans.length}`)
}

export async function ingestLogs(
  c: Context<AppEnv>,
  provider: ResolvedIngestProvider,
): Promise<void> {
  const raw = new Uint8Array(await c.req.arrayBuffer())
  const body = provider.decode(raw)
  const records = stampIngestProvider(await provider.parseLogs(body), provider.id)
  await storeLogs(c.get("db"), records)
  log(`ingest batch provider=${provider.id} signal=logs count=${records.length}`)
}

export async function ingestMetrics(
  c: Context<AppEnv>,
  provider: ResolvedIngestProvider,
): Promise<void> {
  const raw = new Uint8Array(await c.req.arrayBuffer())
  const body = provider.decode(raw)
  const points = stampIngestProvider(await provider.parseMetrics(body), provider.id)
  await storeMetrics(c.get("db"), points)
  log(
    `ingest batch provider=${provider.id} signal=metrics count=${points.length}`,
  )
}
