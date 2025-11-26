/**
 * Health Data Routes
 * Defines HTTP routes for health data endpoints
 */

import { Hono } from "hono";
import { HealthDataController } from "@backend/controllers/HealthDataController.ts";
import { basicAuth } from "@backend/middlewares/basicAuth.ts";

const healthData = new Hono();
const healthDataController = new HealthDataController();

/**
 * POST /api/health-data
 * Create health data
 */
healthData.post("/", basicAuth(), (c) => healthDataController.create(c));

/**
 * GET /api/health-data
 * Get health data with filters
 */
healthData.get("/", basicAuth(), (c) => healthDataController.getAll(c));

/**
 * GET /api/health-data/:id
 * Get health data by ID
 */
healthData.get("/:id", basicAuth(), (c) => healthDataController.getById(c));

/**
 * PUT /api/health-data/:id
 * Update health data
 */
healthData.put("/:id", basicAuth(), (c) => healthDataController.update(c));

/**
 * DELETE /api/health-data/:id
 * Delete health data
 */
healthData.delete("/:id", basicAuth(), (c) => healthDataController.delete(c));

export { healthData };
