/**
 * Ownership Verification Middleware
 * Ensures users can only access their own data
 */

import type { Context, Next } from "hono";
import { getAuthenticatedUser } from "@backend/middlewares/basicAuth.ts";
import { AuthorizationError } from "@shared/types/errors.ts";
import { createLogger } from "@backend/utils/logger.ts";

const logger = createLogger("OwnershipVerification");

/**
 * Verify that the authenticated user owns the requested resource
 * This middleware expects the resource's userId to be available in context
 */
export function verifyOwnership() {
  return async (c: Context, next: Next) => {
    const authenticatedUser = getAuthenticatedUser(c);
    const resourceUserId = c.get("resourceUserId");

    if (!resourceUserId) {
      logger.error("Resource userId not found in context");
      throw new Error("リソースの所有者情報が見つかりません");
    }

    // Convert to bigint for comparison
    const authUserId = authenticatedUser.userId;
    const resUserId = typeof resourceUserId === "string"
      ? BigInt(resourceUserId)
      : resourceUserId;

    if (authUserId !== resUserId) {
      logger.warn("Unauthorized access attempt", {
        authenticatedUserId: authUserId.toString(),
        resourceUserId: resUserId.toString(),
        path: c.req.path,
      });
      throw new AuthorizationError("このリソースへのアクセス権限がありません");
    }

    logger.debug("Ownership verification passed", {
      userId: authUserId.toString(),
      path: c.req.path,
    });

    await next();
  };
}

/**
 * Helper function to set resource userId in context
 * Use this in your controller/service before applying ownership verification
 */
export function setResourceUserId(c: Context, userId: bigint): void {
  c.set("resourceUserId", userId);
}
