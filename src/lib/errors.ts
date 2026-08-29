/**
 * Application errors that carry an HTTP status and a stable machine code.
 * Route handlers translate these into JSON; server components translate them
 * into the appropriate error screen.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You need to sign in to continue.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "We could not find what you were looking for.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Please check the highlighted fields.", details?: unknown) {
    super(message, 422, "VALIDATION_ERROR", details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = "CONFLICT", details?: unknown) {
    super(message, 409, code, details);
  }
}

/** Raised when a slot was taken between availability lookup and confirmation. */
export class SlotUnavailableError extends ConflictError {
  constructor(
    message = "This appointment time is no longer available. Please select another time.",
  ) {
    super(message, "SLOT_UNAVAILABLE");
  }
}

/** Raised when a temporary hold lapsed before payment completed. */
export class HoldExpiredError extends ConflictError {
  constructor(
    message = "Your reservation expired before payment was completed. Please choose a time again.",
  ) {
    super(message, "HOLD_EXPIRED");
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many attempts. Please wait a moment and try again.") {
    super(message, 429, "RATE_LIMITED");
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
