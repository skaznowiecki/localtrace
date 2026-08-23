import type { Db } from "@shared/db"
import type { MetricDataPoint } from "../types/metric"
import * as repo from "../repositories/metrics"

export async function execute(
  db: Db,
  points: MetricDataPoint[],
): Promise<void> {
  if (points.length === 0) return
  await db.run(async (conn) => {
    await conn.run("BEGIN")
    try {
      await repo.bulkCreate(conn, points)
      await conn.run("COMMIT")
    } catch (err) {
      try {
        await conn.run("ROLLBACK")
      } catch {
        // ignore
      }
      throw err
    }
  })
}
