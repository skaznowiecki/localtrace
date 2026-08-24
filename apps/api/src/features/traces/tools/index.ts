import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { register as facets } from "./facets"
import { register as list } from "./list"
import { register as debugErrors } from "./prompts/debug-errors"
import { register as findSlow } from "./prompts/find-slow"
import { register as investigate } from "./prompts/investigate"
import { register as trace } from "./resources/trace"
import { register as search } from "./search"
import { register as span } from "./span"
import { register as spansByType } from "./spans-by-type"
import { register as sql } from "./sql"
import { register as withSpans } from "./with-spans"

export function register(server: McpServer, db: Db) {
  list(server, db)
  withSpans(server, db)
  span(server, db)
  sql(server, db)
  spansByType(server, db)
  search(server, db)
  facets(server, db)
  trace(server, db)
  investigate(server, db)
  debugErrors(server)
  findSlow(server)
}
