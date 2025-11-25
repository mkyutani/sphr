/**
 * Basic Authentication Middleware
 * Handles HTTP Basic Authentication
 */

import type { Context, Next } from "hono";
import { AuthService } from "@backend/services/AuthService.ts";
import { db } from "@backend/models/db.ts";
import { AuthenticationError } from "@shared/types/errors.ts";
import { createLogger } from "@backend/utils/logger.ts";
import type { UserContext } from "@shared/types/session.ts";

const logger = createLogger("BasicAuth");

/**
 * Parse Basic Authentication header
 */
function parseBasicAuth(authHeader: string): { username: string; password: string } | null {
  if (!authHeader.startsWith("Basic ")) {
    return null;
  }

  try {
    const base64Credentials = authHeader.substring(6);
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(":");

    if (!username || !password) {
      return null;
    }

    return { username, password };
  } catch {
    return null;
  }
}

/**
 * Basic Authentication Middleware
 */
export function basicAuth() {
  const authService = new AuthService(db);

  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader) {
      logger.warn("Missing Authorization header");
      throw new AuthenticationError("認証が必要です");
    }

    // Parse credentials
    const credentials = parseBasicAuth(authHeader);
    if (!credentials) {
      logger.warn("Invalid Authorization header format");
      throw new AuthenticationError("認証形式が正しくありません");
    }

    // Verify credentials
    const isValid = await authService.verifyPassword(credentials.username, credentials.password);
    if (!isValid) {
      logger.warn(`Authentication failed for user: ${credentials.username}`);
      throw new AuthenticationError("ユーザー名またはパスワードが正しくありません");
    }

    // Get user information
    const user = await authService.getUserByUsername(credentials.username);
    if (!user) {
      logger.error(`User not found after successful authentication: ${credentials.username}`);
      throw new AuthenticationError("ユーザー情報の取得に失敗しました");
    }

    // Store user context in request
    const userContext: UserContext = {
      userId: user.userId,
      username: user.username,
    };
    c.set("user", userContext);

    logger.info(`User authenticated: ${user.username}`);

    await next();
  };
}

/**
 * Get authenticated user from context
 */
export function getAuthenticatedUser(c: Context): UserContext {
  const user = c.get("user");
  if (!user) {
    throw new AuthenticationError("認証情報が見つかりません");
  }
  return user as UserContext;
}
