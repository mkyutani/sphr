/**
 * Main Application Entry Point
 * Sets up Hono server with middleware and routes
 */

import { Hono } from "hono";
import { cors } from "jsr:@hono/hono@^4.6/cors";
import { errorHandler, notFoundHandler } from "@backend/middlewares/errorHandler.ts";
import { requestLogger } from "@backend/middlewares/requestLogger.ts";
import { auth } from "@backend/routes/auth.ts";
import { testConnection } from "@backend/models/db.ts";
import { createLogger } from "@backend/utils/logger.ts";

const logger = createLogger("App");

// Create Hono app instance
const app = new Hono();

// Global middleware
app.use("*", errorHandler);
app.use("*", requestLogger);
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:8000"],
    credentials: true,
  }),
);

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.route("/api/auth", auth);

// 404 handler
app.notFound(notFoundHandler);

// Start server
const port = Number(Deno.env.get("PORT")) || 8000;

// Test database connection before starting server
logger.info("Testing database connection...");
const dbConnected = await testConnection();

if (!dbConnected) {
  logger.error("Failed to connect to database. Exiting...");
  Deno.exit(1);
}

logger.info(`Starting server on port ${port}...`);
logger.info(`Environment: ${Deno.env.get("NODE_ENV") || "development"}`);

Deno.serve({ port }, app.fetch);
