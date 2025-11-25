/**
 * Request Logger Middleware
 * Logs incoming HTTP requests and responses
 */

import type { Context, Next } from "hono";
import { createLogger } from "@backend/utils/logger.ts";

const logger = createLogger("HTTP");

/**
 * Request logging middleware
 */
export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const { method, url } = c.req;

  // Log incoming request
  logger.info(`→ ${method} ${url}`);

  await next();

  // Log response
  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info(`← ${method} ${url} ${status} ${duration}ms`, {
    method,
    url,
    status,
    duration,
  });
}
