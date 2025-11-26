/**
 * Analysis Controller
 * Handles HTTP requests for data analysis operations
 */

import type { Context } from "hono";
import { AnalysisService } from "@backend/services/AnalysisService.ts";
import { db } from "@backend/models/db.ts";
import { createLogger } from "@backend/utils/logger.ts";
import { getAuthenticatedUser } from "@backend/middlewares/basicAuth.ts";

const logger = createLogger("AnalysisController");

/**
 * Analysis Controller
 */
export class AnalysisController {
  private analysisService: AnalysisService;

  constructor() {
    this.analysisService = new AnalysisService(db);
  }

  /**
   * GET /api/analysis/statistics
   * Get statistics (max, min, average)
   */
  async getStatistics(c: Context) {
    const user = getAuthenticatedUser(c);

    const dataTypeId = c.req.query("dataTypeId");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    logger.info("Get statistics request", { userId: user.userId.toString() });

    // Validate required parameters
    if (!dataTypeId || !startDate || !endDate) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "データ種類ID、開始日、終了日は必須です",
          },
        },
        400,
      );
    }

    // Get statistics
    const result = await this.analysisService.getStatistics(user.userId, {
      dataTypeId: BigInt(dataTypeId),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return c.json({
      success: true,
      data: {
        dataTypeId: result.dataTypeId.toString(),
        dataTypeName: result.dataTypeName,
        unit: result.unit,
        max: result.max,
        min: result.min,
        avg: result.avg,
        count: result.count,
        startDate: result.startDate,
        endDate: result.endDate,
      },
    });
  }

  /**
   * GET /api/analysis/graph
   * Get graph data (time series)
   */
  async getGraphData(c: Context) {
    const user = getAuthenticatedUser(c);

    const dataTypeId = c.req.query("dataTypeId");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    logger.info("Get graph data request", { userId: user.userId.toString() });

    // Validate required parameters
    if (!dataTypeId || !startDate || !endDate) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "データ種類ID、開始日、終了日は必須です",
          },
        },
        400,
      );
    }

    // Get graph data
    const result = await this.analysisService.getGraphData(user.userId, {
      dataTypeId: BigInt(dataTypeId),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return c.json({
      success: true,
      data: {
        dataTypeId: result.dataTypeId.toString(),
        dataTypeName: result.dataTypeName,
        unit: result.unit,
        data: result.data,
      },
    });
  }

  /**
   * GET /api/analysis/moving-average
   * Get moving average
   */
  async getMovingAverage(c: Context) {
    const user = getAuthenticatedUser(c);

    const dataTypeId = c.req.query("dataTypeId");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const window = c.req.query("window");

    logger.info("Get moving average request", { userId: user.userId.toString() });

    // Validate required parameters
    if (!dataTypeId || !startDate || !endDate) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "データ種類ID、開始日、終了日は必須です",
          },
        },
        400,
      );
    }

    // Get moving average
    const result = await this.analysisService.getMovingAverage(user.userId, {
      dataTypeId: BigInt(dataTypeId),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      window: window ? Number(window) : 30,
    });

    return c.json({
      success: true,
      data: {
        dataTypeId: result.dataTypeId.toString(),
        dataTypeName: result.dataTypeName,
        unit: result.unit,
        window: result.window,
        data: result.data,
      },
    });
  }

  /**
   * GET /api/analysis/compare
   * Compare multiple data types
   */
  async compareDataTypes(c: Context) {
    const user = getAuthenticatedUser(c);

    const dataTypeIds = c.req.queries("dataTypeIds[]");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    logger.info("Compare data types request", { userId: user.userId.toString() });

    // Validate required parameters
    if (!dataTypeIds || dataTypeIds.length === 0 || !startDate || !endDate) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "データ種類ID（複数）、開始日、終了日は必須です",
          },
        },
        400,
      );
    }

    // Compare data types
    const result = await this.analysisService.compareDataTypes(user.userId, {
      dataTypeIds: dataTypeIds.map((id) => BigInt(id)),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return c.json({
      success: true,
      data: result.map((item) => ({
        dataTypeId: item.dataTypeId.toString(),
        dataTypeName: item.dataTypeName,
        unit: item.unit,
        data: item.data,
      })),
    });
  }
}
