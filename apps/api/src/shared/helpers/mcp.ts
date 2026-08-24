import * as z from "zod"
import { BadRequestError } from "@shared/errors"

export type ListPage<T> = {
  items: T[]
  total: number
  offset: number
  limit: number
  next_offset: number | null
}

export function listPage<T>(
  items: T[],
  total: number,
  offset: number,
  limit: number,
): ListPage<T> {
  return {
    items,
    total,
    offset,
    limit,
    next_offset: offset + items.length < total ? offset + items.length : null,
  }
}

export const listPageSchema = z.object({
  items: z.array(z.unknown()),
  total: z.number(),
  offset: z.number(),
  limit: z.number(),
  next_offset: z.number().nullable(),
})

export const itemsSchema = z.object({ items: z.array(z.unknown()) })
export const objectSchema = z.object({}).passthrough()

export function assertKnownValue(
  field: string,
  value: string | undefined,
  known: string[],
  tool: string,
): void {
  if (!value) return
  if (known.includes(value)) return
  throw new BadRequestError(
    `unknown ${field} "${value}". Call ${tool} for valid values.`,
  )
}

const DEFAULT_TRUNCATE_BYTES = 8_192

export function truncateJson(
  value: unknown,
  maxBytes = DEFAULT_TRUNCATE_BYTES,
): unknown {
  const text = JSON.stringify(value)
  if (text == null || text.length <= maxBytes) return value
  return {
    _truncated: true,
    preview: text.slice(0, maxBytes),
    placeholder: "[truncated]",
    original_bytes: text.length,
  }
}

function asObject(data: unknown): Record<string, unknown> {
  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>
  }
  return { value: data }
}

export async function jsonResult(fn: () => Promise<unknown>): Promise<{
  content: [{ type: "text"; text: string }]
  structuredContent?: Record<string, unknown>
  isError?: boolean
}> {
  try {
    const data = await fn()
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: asObject(data),
    }
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err)
    return {
      isError: true,
      content: [{ type: "text", text }],
    }
  }
}
