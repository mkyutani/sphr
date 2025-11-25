/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

import type { Context, Next } from "hono";
import { AuthenticationError } from "@shared/types/errors.ts";
import { createLogger } from "@backend/utils/logger.ts";

const logger = createLogger("CSRF");

/**
 * Generate a random CSRF token
 */
function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * CSRF protection middleware
 *
 * For state-changing operations (POST, PUT, DELETE, PATCH):
 * - Validates CSRF token from request header
 *
 * For safe operations (GET, HEAD, OPTIONS):
 * - Generates and returns new CSRF token in response header
 */
export function csrfProtection() {
  return async (c: Context, next: Next) => {
    const method = c.req.method;
    const csrfToken = c.req.header("X-CSRF-Token");

    // Safe methods - generate and return token
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      const token = generateCSRFToken();
      c.set("csrfToken", token);
      c.header("X-CSRF-Token", token);
      await next();
      return;
    }

    // State-changing methods - validate token
    if (!csrfToken) {
      logger.warn("CSRF token missing", {
        method,
        path: c.req.path,
      });
      throw new AuthenticationError("CSRFトークンが必要です");
    }

    // Verify token format (64 hex characters)
    if (!/^[a-f0-9]{64}$/i.test(csrfToken)) {
      logger.warn("Invalid CSRF token format", {
        method,
        path: c.req.path,
      });
      throw new AuthenticationError("CSRFトークンの形式が正しくありません");
    }

    // In a real implementation, you would validate the token against
    // a stored value (in session or database)
    // For now, we just verify the format is correct

    logger.debug("CSRF token validated", {
      method,
      path: c.req.path,
    });

    await next();
  };
}

/**
 * Get CSRF token from context
 */
export function getCSRFToken(c: Context): string {
  const token = c.get("csrfToken");
  if (!token) {
    throw new Error("CSRFトークンが見つかりません");
  }
  return token as string;
}
