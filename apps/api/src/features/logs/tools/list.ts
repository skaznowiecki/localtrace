import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import {
  assertKnownValue,
  jsonResult,
  listPage,
  listPageSchema,
} from "@shared/helpers"
import * as schema from "../schemas/list"
import { execute as count } from "../services/count"
import { execute as facets } from "../services/facets"
import { execute as list } from "../services/list"
import type { LogDto } from "../types/log"
import { examples } from "./examples/list"

function compact(log: LogDto) {
  const { attributes, ...rest } = log
  return rest
}

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "list_logs",
    {
      title: "List logs",
      description: [
        "List recent logs. Call list_log_facets first to discover valid filter values.",
        "Prefer since_minutes. Attributes are omitted unless raw=true.",
        "sort/order default to date desc.",
        "",
        "Examples:",
        ...examples.map(
          (example) => `- ${example.description}: ${JSON.stringify(example.arguments)}`,
        ),
      ].join("\n"),
      inputSchema: schema.input,
      outputSchema: listPageSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (args) =>
      jsonResult(async () => {
        const filters = schema.filters(args)
        if (filters.service) {
          const known = await facets(db)
          assertKnownValue(
            "service",
            filters.service,
            known.services.map((item) => item.value),
            "list_log_facets",
          )
        }
        const [logs, total] = await Promise.all([
          list(db, filters),
          count(db, filters),
        ])
        const items = filters.raw ? logs : logs.map(compact)
        return listPage(items, total, filters.offset, filters.limit)
      }),
  )
}
