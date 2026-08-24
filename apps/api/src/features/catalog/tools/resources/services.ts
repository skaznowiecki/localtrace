import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { execute } from "../../services/list"

export function register(server: McpServer, db: Db) {
  server.registerResource(
    "services",
    "local-tracer://services",
    {
      title: "Services",
      description: "Services that have ingested traces, with trace counts",
      mimeType: "application/json",
    },
    async (uri) => {
      const services = await execute(db)
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(services),
          },
        ],
      }
    },
  )
}
