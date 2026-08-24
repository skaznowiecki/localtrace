import { McpServer } from "@modelcontextprotocol/server"
import { tools as catalog } from "@features/catalog"
import { tools as logs } from "@features/logs"
import { tools as metrics } from "@features/metrics"
import { tools as traces } from "@features/traces"
import type { Db } from "@shared/db"
import { instructions } from "./instructions"

export function createServer(db: Db): McpServer {
  const server = new McpServer(
    {
      name: "local-tracer",
      version: "0.1.0",
      title: "Local Tracer",
    },
    { instructions },
  )
  traces.register(server, db)
  logs.register(server, db)
  catalog.register(server, db)
  metrics.register(server, db)
  return server
}
