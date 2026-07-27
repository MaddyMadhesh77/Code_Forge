/**
 * Application errors carry the HTTP status and a stable machine-readable code,
 * so the exception filter can translate any thrown value into a consistent
 * response without every route hand-rolling its own error shape.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    /** Safe to serialize to the client; never put internals here. */
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown, code = "BAD_REQUEST") {
    super(message, 400, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown, message = "Request validation failed") {
    super(message, 422, "VALIDATION_FAILED", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", code = "UNAUTHORIZED") {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions", code = "FORBIDDEN") {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource", code = "NOT_FOUND") {
    super(`${resource} not found`, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists", code = "CONFLICT") {
    super(message, 409, code);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests", readonly retryAfterSeconds = 60) {
    super(message, 429, "RATE_LIMITED");
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Service unavailable", code = "SERVICE_UNAVAILABLE") {
    super(message, 503, code);
  }
}

export class TimeoutError extends AppError {
  constructor(message = "Request timed out") {
    super(message, 504, "TIMEOUT");
  }
}
