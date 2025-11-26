/**
 * Data Type Routes
 * Defines HTTP routes for data type management endpoints
 */

import { Hono } from "hono";
import { DataTypeController } from "@backend/controllers/DataTypeController.ts";
import { basicAuth } from "@backend/middlewares/basicAuth.ts";

const dataType = new Hono();
const dataTypeController = new DataTypeController();

/**
 * GET /api/data-types
 * Get all active data types (for regular users)
 */
dataType.get("/", basicAuth(), (c) => dataTypeController.getAllActive(c));

/**
 * GET /api/data-types/all
 * Get all data types including inactive (for admin)
 */
dataType.get("/all", basicAuth(), (c) => dataTypeController.getAll(c));

/**
 * GET /api/data-types/:id
 * Get data type by ID
 */
dataType.get("/:id", basicAuth(), (c) => dataTypeController.getById(c));

/**
 * POST /api/data-types
 * Create a new data type
 */
dataType.post("/", basicAuth(), (c) => dataTypeController.create(c));

/**
 * PUT /api/data-types/:id
 * Update data type
 */
dataType.put("/:id", basicAuth(), (c) => dataTypeController.update(c));

/**
 * PATCH /api/data-types/:id/deactivate
 * Deactivate data type (logical delete)
 */
dataType.patch("/:id/deactivate", basicAuth(), (c) => dataTypeController.deactivate(c));

export { dataType };
