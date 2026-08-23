import {
  ResourceNotFoundError,
  ResourceTemplate,
  type McpServer,
} from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { NotFoundError } from "@shared/errors"
import { traceId } from "@shared/helpers"
import { filters } from "../../schemas/list"
import { execute as list } from "../../services/list"
import { execute as withSpans } from "../../services/with-spans"

export function register(server: McpServer, db: Db) {
  server.registerResource(
    "trace",
    new ResourceTemplate("local-tracer://traces/{id}", {
      list: async () => {
        const traces = await list(db, filters({ limit: 20 }))
        return {
          resources: traces.map((trace) => ({
            uri: `local-tracer://traces/${trace.id}`,
            name: trace.name,
            description: `${trace.service} ${trace.status} ${trace.duration_ms}ms`,
            mimeType: "application/json",
          })),
        }
      },
    }),
    {
      title: "Trace",
      description: "Full trace detail (same payload as get_trace). breakdown is exclusive time rolled up to Prisma ops, outbound HTTP, Redis, and SQL (remainder App); null means still processing.",
      mimeType: "application/json",
    },
    async (uri, { id }) => {
      const parsed = traceId.safeParse(id)
      if (!parsed.success) {
        throw new ResourceNotFoundError(uri.href, parsed.error.issues[0]?.message)
      }
      try {
        const detail = await withSpans(db, parsed.data)
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(detail, null, 2),
            },
          ],
        }
      } catch (err) {
        if (err instanceof NotFoundError) {
          throw new ResourceNotFoundError(uri.href, err.message)
        }
        throw err
      }
    },
  )
}
