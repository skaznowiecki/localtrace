import type { Db } from "@shared/db"
import { nsToRfc3339, windowNs } from "@shared/helpers"
import type { z } from "zod"
import * as repo from "../repositories/metrics"
import type { input } from "../schemas/query"
import type { MetricPointDto } from "../types/dto"

export async function execute(
  db: Db,
  args: z.infer<typeof input>,
): Promise<MetricPointDto[]> {
  const window = windowNs(args)
  const rows = await db.run((conn) =>
    repo.query(conn, {
      name: args.name,
      service: args.service,
      sinceNs: window.sinceNs,
      untilNs: window.untilNs,
      limit: args.limit ?? 100,
    }),
  )
  return rows.map((row) => ({
    time: nsToRfc3339(row.timeNs),
    name: row.name,
    service: row.serviceName,
    value: row.value,
    count: row.count,
    sum: row.sum,
  }))
}
