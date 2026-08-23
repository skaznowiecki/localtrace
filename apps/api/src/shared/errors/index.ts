import type { ContentfulStatusCode } from "hono/utils/http-status"

export class AppError extends Error {
  constructor(
    message: string,
    readonly status: ContentfulStatusCode = 500,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400)
    this.name = "BadRequestError"
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404)
    this.name = "NotFoundError"
  }
}

export function onInvalid(
  result:
    | { success: true }
    | { success: false; error: { issues: { message?: string }[] } },
): void {
  if (result.success) return
  throw new BadRequestError(result.error.issues[0]?.message ?? "invalid request")
}
