import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { jsonResult } from "@shared/helpers"
import * as schema from "../schemas/list"
import { execute } from "../services/list"
import { examples } from "./examples/list"

export function register(server: McpServer, db: Db) {
  server.registerTool(
    "list_traces",
    {
      title: "List traces",
      description: [
        "List recent traces. Call list_facets first to discover valid filter values.",
        "Each card includes breakdown: exclusive time rolled up to Prisma ops, outbound HTTP, Redis, and SQL; remainder is App. null means still processing.",
        "sort/order default to date desc.",
        "",
        "Examples:",
        ...examples.map(
          (example) => `- ${example.description}: ${JSON.stringify(example.arguments)}`,
        ),
      ].join("\n"),
      inputSchema: schema.input,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (args) => jsonResult(() => execute(db, schema.filters(args))),
  )
}
