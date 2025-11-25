/**
 * Error Handler Middleware
 * Centralizes error handling for the application
 */

import type { Context, Next } from "hono";
import { isAppError } from "@shared/types/errors.ts";

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
  };
}

/**
 * Global error handler middleware
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error("Error caught by error handler:", error);

    // Handle known application errors
    if (isAppError(error)) {
      const response: ErrorResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };

      // Include stack trace in development mode
      if (Deno.env.get("NODE_ENV") === "development") {
        response.error.stack = error.stack;
      }

      return c.json(response, error.statusCode);
    }

    // Handle unexpected errors
    const response: ErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "予期しないエラーが発生しました",
      },
    };

    // Include stack trace in development mode
    if (Deno.env.get("NODE_ENV") === "development" && error instanceof Error) {
      response.error.stack = error.stack;
    }

    return c.json(response, 500);
  }
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(c: Context) {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `リソースが見つかりませんでした: ${c.req.path}`,
    },
  };

  return c.json(response, 404);
}
