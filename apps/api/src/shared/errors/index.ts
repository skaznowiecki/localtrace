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
