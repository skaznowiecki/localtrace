export async function jsonResult(fn: () => Promise<unknown>): Promise<{
  content: [{ type: "text"; text: string }]
  isError?: boolean
}> {
  try {
    const data = await fn()
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    }
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err)
    return {
      isError: true,
      content: [{ type: "text", text }],
    }
  }
}
