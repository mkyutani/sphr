/**
 * Authentication Controller
 * Handles HTTP requests for authentication operations
 */

import type { Context } from "hono";
import { AuthService } from "@backend/services/AuthService.ts";
import { db } from "@backend/models/db.ts";
import { createLogger } from "@backend/utils/logger.ts";

const logger = createLogger("AuthController");

/**
 * Authentication Controller
 */
export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService(db);
  }

  /**
   * POST /api/auth/register
   * Register a new user
   */
  async register(c: Context) {
    const body = await c.req.json();
    const { username, password } = body;

    logger.info("Registration request received", { username });

    // Validate request body
    if (!username || !password) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "ユーザー名とパスワードは必須です",
          },
        },
        400,
      );
    }

    // Register user
    const result = await this.authService.register(username, password);

    return c.json(
      {
        success: true,
        data: {
          userId: result.userId.toString(),
          username: result.username,
          message: "ユーザー登録が完了しました",
        },
      },
      201,
    );
  }

  /**
   * POST /api/auth/login
   * Login user
   */
  async login(c: Context) {
    const body = await c.req.json();
    const { username, password } = body;

    logger.info("Login request received", { username });

    // Validate request body
    if (!username || !password) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "ユーザー名とパスワードは必須です",
          },
        },
        400,
      );
    }

    // Verify credentials
    const isValid = await this.authService.verifyPassword(username, password);
    if (!isValid) {
      return c.json(
        {
          success: false,
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "ユーザー名またはパスワードが正しくありません",
          },
        },
        401,
      );
    }

    // Get user information
    const user = await this.authService.getUserByUsername(username);
    if (!user) {
      return c.json(
        {
          success: false,
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "ユーザー情報の取得に失敗しました",
          },
        },
        500,
      );
    }

    // Create session data
    const sessionMaxAge = Number(Deno.env.get("SESSION_MAX_AGE")) || 86400000; // 24 hours
    const now = Date.now();
    const sessionData = {
      userId: user.userId.toString(),
      username: user.username,
      createdAt: now,
      expiresAt: now + sessionMaxAge,
    };

    // Set secure cookie
    const isProduction = Deno.env.get("NODE_ENV") === "production";
    c.header(
      "Set-Cookie",
      `session=${JSON.stringify(sessionData)}; Max-Age=${sessionMaxAge / 1000}; Path=/; HttpOnly; SameSite=Strict${isProduction ? "; Secure" : ""}`,
    );

    logger.info(`User logged in successfully: ${username}`);

    return c.json({
      success: true,
      data: {
        userId: user.userId.toString(),
        username: user.username,
        message: "ログインしました",
      },
    });
  }

  /**
   * POST /api/auth/logout
   * Logout user
   */
  async logout(c: Context) {
    logger.info("Logout request received");

    // Clear session cookie
    c.header(
      "Set-Cookie",
      "session=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict",
    );

    return c.json({
      success: true,
      data: {
        message: "ログアウトしました",
      },
    });
  }
}
