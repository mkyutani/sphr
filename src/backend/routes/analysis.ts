/**
 * Analysis Routes
 * Defines HTTP routes for data analysis endpoints
 */

import { Hono } from "hono";
import { AnalysisController } from "@backend/controllers/AnalysisController.ts";
import { basicAuth } from "@backend/middlewares/basicAuth.ts";

const analysis = new Hono();
const analysisController = new AnalysisController();

/**
 * GET /api/analysis/statistics
 * Get statistics (max, min, average)
 */
analysis.get("/statistics", basicAuth(), (c) => analysisController.getStatistics(c));

/**
 * GET /api/analysis/graph
 * Get graph data (time series)
 */
analysis.get("/graph", basicAuth(), (c) => analysisController.getGraphData(c));

/**
 * GET /api/analysis/moving-average
 * Get moving average
 */
analysis.get("/moving-average", basicAuth(), (c) => analysisController.getMovingAverage(c));

/**
 * GET /api/analysis/compare
 * Compare multiple data types
 */
analysis.get("/compare", basicAuth(), (c) => analysisController.compareDataTypes(c));

export { analysis };
