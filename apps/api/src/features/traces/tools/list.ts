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
import { examples } from "./examples/list"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "list_traces",
    {
      title: "List traces",
      description: [
        "List recent traces. Call list_facets first to discover valid filter values.",
        "Prefer since_minutes over RFC3339 since. Do not call get_trace in a loop over this list.",
        "Each card includes breakdown: exclusive time rolled up to Prisma ops, outbound HTTP, Redis, and SQL; remainder is App. null means still processing.",
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
            "list_facets",
          )
        }
        const [items, total] = await Promise.all([
          list(db, filters),
          count(db, filters),
        ])
        return listPage(items, total, filters.offset, filters.limit)
      }),
  )
}
