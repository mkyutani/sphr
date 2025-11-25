/**
 * Authentication Routes
 * Defines HTTP routes for authentication endpoints
 */

import { Hono } from "hono";
import { AuthController } from "@backend/controllers/AuthController.ts";

const auth = new Hono();
const authController = new AuthController();

/**
 * POST /api/auth/register
 * Register a new user
 */
auth.post("/register", (c) => authController.register(c));

/**
 * POST /api/auth/login
 * Login user
 */
auth.post("/login", (c) => authController.login(c));

/**
 * POST /api/auth/logout
 * Logout user
 */
auth.post("/logout", (c) => authController.logout(c));

export { auth };
