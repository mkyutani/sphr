/**
 * Security Headers Middleware
 * Sets security-related HTTP headers
 */

import type { Context, Next } from "hono";

/**
 * Security headers middleware
 * Sets various security headers to protect against common attacks
 */
export function securityHeaders() {
  return async (c: Context, next: Next) => {
    await next();

    // Prevent XSS attacks
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("X-XSS-Protection", "1; mode=block");

    // Content Security Policy
    c.header(
      "Content-Security-Policy",
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none'",
    );

    // Referrer Policy
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions Policy (formerly Feature Policy)
    c.header(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=()",
    );

    // Strict Transport Security (HSTS)
    // Only enable in production with HTTPS
    if (Deno.env.get("NODE_ENV") === "production") {
      c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }
  };
}
