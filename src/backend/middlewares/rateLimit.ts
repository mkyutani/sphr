/**
 * Rate Limiting Middleware
 * Limits the number of requests per time window
 */

import type { Context, Next } from "hono";
import { createLogger } from "@backend/utils/logger.ts";

const logger = createLogger("RateLimit");

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

// In-memory store for rate limiting
// In production, use Redis or similar distributed cache
const store: RateLimitStore = {};

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
}

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetAt < now) {
      delete store[key];
    }
  }
}, 60000); // Clean up every minute

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const { windowMs, maxRequests, skipSuccessfulRequests = false } = config;

  return async (c: Context, next: Next) => {
    // Get client identifier (IP address or user ID)
    const identifier = getClientIdentifier(c);

    // Get current time
    const now = Date.now();

    // Get or create rate limit entry
    if (!store[identifier] || store[identifier].resetAt < now) {
      store[identifier] = {
        count: 0,
        resetAt: now + windowMs,
      };
    }

    const entry = store[identifier];

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      logger.warn("Rate limit exceeded", {
        identifier,
        count: entry.count,
        maxRequests,
      });

      return c.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "リクエスト数が上限を超えました。しばらくしてから再試行してください。",
            retryAfter: Math.ceil((entry.resetAt - now) / 1000), // seconds
          },
        },
        429,
      );
    }

    // Increment count
    entry.count++;

    // Set rate limit headers
    c.header("X-RateLimit-Limit", maxRequests.toString());
    c.header("X-RateLimit-Remaining", (maxRequests - entry.count).toString());
    c.header("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000).toString());

    await next();

    // Decrement count if skipSuccessfulRequests is true and request was successful
    if (skipSuccessfulRequests && c.res.status < 400) {
      entry.count--;
    }
  };
}

/**
 * Get client identifier from context
 */
function getClientIdentifier(c: Context): string {
  // Try to get authenticated user ID
  const user = c.get("user");
  if (user && user.userId) {
    return `user:${user.userId}`;
  }

  // Fall back to IP address
  const ip =
    c.req.header("x-forwarded-for") ||
    c.req.header("x-real-ip") ||
    "unknown";

  return `ip:${ip}`;
}

/**
 * Preset rate limit configurations
 */
export const RateLimitPresets = {
  /**
   * Strict rate limit: 10 requests per minute
   * For sensitive operations like authentication
   */
  strict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },

  /**
   * Moderate rate limit: 60 requests per minute
   * For general API endpoints
   */
  moderate: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  },

  /**
   * Lenient rate limit: 300 requests per minute
   * For read-only endpoints
   */
  lenient: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300,
  },
};
