import type { Db } from "@shared/db"
import type { Config } from "./config"

export type AppEnv = {
  Variables: {
    db: Db
    config: Config
  }
}
