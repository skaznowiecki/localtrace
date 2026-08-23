import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { register as facets } from "./facets"
import { register as forTrace } from "./for-trace"
import { register as list } from "./list"

export function register(server: McpServer, db: Db) {
  list(server, db)
  facets(server, db)
  forTrace(server, db)
}
