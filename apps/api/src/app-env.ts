import type { Db } from "./shared/db"
import type { Config } from "./config"

export type AppEnv = {
  Variables: {
    db: Db
    config: Config
    ingestGate: IngestGate
  }
}

export class IngestGate {
  private inFlight = 0

  constructor(private readonly max: number) {}

  tryAcquire(): boolean {
    if (this.inFlight >= this.max) return false
    this.inFlight += 1
    return true
  }

  release(): void {
    this.inFlight = Math.max(0, this.inFlight - 1)
  }
}
