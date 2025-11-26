/**
 * Export Routes
 * Defines HTTP routes for data export endpoints
 */

import { Hono } from "hono";
import { ExportController } from "@backend/controllers/ExportController.ts";
import { basicAuth } from "@backend/middlewares/basicAuth.ts";

const exportRoute = new Hono();
const exportController = new ExportController();

/**
 * POST /api/export
 * Export health data (CSV or PDF)
 */
exportRoute.post("/", basicAuth(), (c) => exportController.exportData(c));

/**
 * GET /api/export/history
 * Get export history
 */
exportRoute.get("/history", basicAuth(), (c) => exportController.getHistory(c));

export { exportRoute };
