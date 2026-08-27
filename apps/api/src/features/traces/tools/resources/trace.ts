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
    new ResourceTemplate("localtrace://traces/{id}", {
      list: async () => {
        const traces = await list(db, filters({ limit: 20 }))
        return {
          resources: traces.map((trace) => ({
            uri: `localtrace://traces/${trace.id}`,
            name: trace.name,
            description: `${trace.service} ${trace.status} ${trace.duration_ms}ms`,
            mimeType: "application/json",
          })),
        }
      },
      complete: {
        async id(value: string) {
          const traces = await list(db, filters({ limit: 20 }))
          const needle = value.toLowerCase()
          return traces
            .map((trace) => trace.id)
            .filter((id) => id.startsWith(needle) || needle.length === 0)
        },
      },
    }),
    {
      title: "Trace",
      description: "Full span tree with attributes (same as get_trace detail=full). Prefer the get_trace tool for the compact overview.",
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
              text: JSON.stringify(detail),
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
