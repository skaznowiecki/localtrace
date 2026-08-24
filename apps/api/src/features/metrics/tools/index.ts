import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { register as facets } from "./facets"
import { register as query } from "./query"

export function register(server: McpServer, db: Db) {
  facets(server, db)
  query(server, db)
}
