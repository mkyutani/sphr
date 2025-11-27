/**
 * Main Application Entry Point
 * Sets up Hono server with middleware and routes
 */

import { Hono } from "hono";
import { cors } from "jsr:@hono/hono@^4.6/cors";
import { errorHandler, notFoundHandler } from "@backend/middlewares/errorHandler.ts";
import { requestLogger } from "@backend/middlewares/requestLogger.ts";
import { securityHeaders } from "@backend/middlewares/securityHeaders.ts";
import { rateLimit, RateLimitPresets } from "@backend/middlewares/rateLimit.ts";
import { auth } from "@backend/routes/auth.ts";
import { dataType } from "@backend/routes/dataType.ts";
import { healthData } from "@backend/routes/healthData.ts";
import { analysis } from "@backend/routes/analysis.ts";
import { exportRoute } from "@backend/routes/export.ts";
import { importRoute } from "@backend/routes/import.ts";
import { testConnection } from "@backend/models/db.ts";
import { createLogger } from "@backend/utils/logger.ts";

const logger = createLogger("App");

// Create Hono app instance
const app = new Hono();

// Global middleware
app.use("*", errorHandler);
app.use("*", requestLogger);
app.use("*", securityHeaders());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:8000"],
    credentials: true,
  }),
);

// Apply rate limiting to all routes
app.use("*", rateLimit(RateLimitPresets.moderate));

// Stricter rate limiting for auth endpoints
app.use("/api/auth/*", rateLimit(RateLimitPresets.strict));

// Health check endpoint with database check
app.get("/health", async (c) => {
  try {
    // Test database connection
    const dbHealthy = await testConnection();

    if (!dbHealthy) {
      return c.json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          checks: {
            database: "failed",
          },
        },
        503,
      );
    }

    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: "ok",
        application: "ok",
      },
      version: "1.0.0",
      uptime: process.uptime ? process.uptime() : null,
    });
  } catch (error) {
    logger.error("Health check failed", error);
    return c.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      503,
    );
  }
});

// API routes
app.route("/api/auth", auth);
app.route("/api/data-types", dataType);
app.route("/api/health-data", healthData);
app.route("/api/analysis", analysis);
app.route("/api/export", exportRoute);
app.route("/api/import", importRoute);

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
