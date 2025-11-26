/**
 * Import Routes
 * Defines HTTP routes for data import endpoints
 */

import { Hono } from "hono";
import { ImportController } from "@backend/controllers/ImportController.ts";
import { basicAuth } from "@backend/middlewares/basicAuth.ts";

const importRoute = new Hono();
const importController = new ImportController();

/**
 * POST /api/import
 * Import health data from CSV file
 */
importRoute.post("/", basicAuth(), (c) => importController.importData(c));

export { importRoute };
