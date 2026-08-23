import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { register as facets } from "./facets"
import { register as list } from "./list"
import { register as investigate } from "./prompts/investigate"
import { register as trace } from "./resources/trace"
import { register as sql } from "./sql"
import { register as withSpans } from "./with-spans"

export function register(server: McpServer, db: Db) {
  list(server, db)
  withSpans(server, db)
  sql(server, db)
  facets(server, db)
  trace(server, db)
  investigate(server)
}
