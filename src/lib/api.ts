import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

import { AppError, ValidationError, isAppError } from "@/lib/errors";

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function apiError(error: unknown): NextResponse<ApiErrorBody> {
  if (isAppError(error)) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check the highlighted fields.",
          details: fieldErrors(error),
        },
      },
      { status: 422 },
    );
  }

  console.error("[api] unhandled error", error);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong on our side. Please try again.",
      },
    },
    { status: 500 },
  );
}

/** Wraps a route handler so thrown AppErrors become correct HTTP responses. */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse | Response>,
) {
  return async (...args: Args): Promise<NextResponse | Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      return apiError(error);
    }
  };
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError("Expected a JSON request body.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError("Please check the highlighted fields.", fieldErrors(result.error));
  }
  return result.data;
}

export function parseQuery<T>(request: Request, schema: ZodType<T>): T {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ValidationError("Invalid query parameters.", fieldErrors(result.error));
  }
  return result.data;
}

export function ok<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

export function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export { AppError };
