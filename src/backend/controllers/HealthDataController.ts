/**
 * Health Data Controller
 * Handles HTTP requests for health data operations
 */

import type { Context } from "hono";
import { HealthDataService } from "@backend/services/HealthDataService.ts";
import { db } from "@backend/models/db.ts";
import { createLogger } from "@backend/utils/logger.ts";
import { getAuthenticatedUser } from "@backend/middlewares/basicAuth.ts";

const logger = createLogger("HealthDataController");

/**
 * Health Data Controller
 */
export class HealthDataController {
  private healthDataService: HealthDataService;

  constructor() {
    this.healthDataService = new HealthDataService(db);
  }

  /**
   * POST /api/health-data
   * Create health data
   */
  async create(c: Context) {
    const user = getAuthenticatedUser(c);
    const body = await c.req.json();
    const { dataTypeId, measurementValue, measurementDate, memo } = body;

    logger.info("Create health data request", { userId: user.userId.toString() });

    // Validate request body
    if (!dataTypeId || measurementValue === undefined || !measurementDate) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "データ種類ID、測定値、測定日は必須です",
          },
        },
        400,
      );
    }

    // Parse inputs
    const parsedDataTypeId = BigInt(dataTypeId);
    const parsedMeasurementValue = Number(measurementValue);
    const parsedMeasurementDate = new Date(measurementDate);

    // Create health data
    const healthData = await this.healthDataService.createHealthData(user.userId, {
      dataTypeId: parsedDataTypeId,
      measurementValue: parsedMeasurementValue,
      measurementDate: parsedMeasurementDate,
      memo,
    });

    return c.json(
      {
        success: true,
        data: {
          healthDataId: healthData.healthDataId.toString(),
          dataTypeId: healthData.dataTypeId.toString(),
          dataTypeName: healthData.dataTypeName,
          unit: healthData.unit,
          measurementValue: healthData.measurementValue,
          measurementDate: healthData.measurementDate,
          memo: healthData.memo,
          message: "健康データを登録しました",
        },
      },
      201,
    );
  }

  /**
   * GET /api/health-data
   * Get health data with filters
   */
  async getAll(c: Context) {
    const user = getAuthenticatedUser(c);

    // Parse query parameters
    const dataTypeId = c.req.query("dataTypeId");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const limit = c.req.query("limit");
    const offset = c.req.query("offset");

    logger.info("Get health data request", { userId: user.userId.toString() });

    // Build filters
    const filters: {
      dataTypeId?: bigint;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {};

    if (dataTypeId) {
      filters.dataTypeId = BigInt(dataTypeId);
    }
    if (startDate) {
      filters.startDate = new Date(startDate);
    }
    if (endDate) {
      filters.endDate = new Date(endDate);
    }
    if (limit) {
      filters.limit = Number(limit);
    }
    if (offset) {
      filters.offset = Number(offset);
    }

    // Get health data
    const result = await this.healthDataService.getHealthData(user.userId, filters);

    return c.json({
      success: true,
      data: {
        items: result.data.map((item) => ({
          healthDataId: item.healthDataId.toString(),
          dataTypeId: item.dataTypeId.toString(),
          dataTypeName: item.dataTypeName,
          unit: item.unit,
          measurementValue: item.measurementValue,
          measurementDate: item.measurementDate,
          memo: item.memo,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  }

  /**
   * GET /api/health-data/:id
   * Get health data by ID
   */
  async getById(c: Context) {
    const user = getAuthenticatedUser(c);
    const id = c.req.param("id");

    logger.info("Get health data by ID request", {
      userId: user.userId.toString(),
      healthDataId: id,
    });

    const healthData = await this.healthDataService.getHealthDataById(user.userId, BigInt(id));

    return c.json({
      success: true,
      data: {
        healthDataId: healthData.healthDataId.toString(),
        dataTypeId: healthData.dataTypeId.toString(),
        dataTypeName: healthData.dataTypeName,
        unit: healthData.unit,
        measurementValue: healthData.measurementValue,
        measurementDate: healthData.measurementDate,
        memo: healthData.memo,
        createdAt: healthData.createdAt,
        updatedAt: healthData.updatedAt,
      },
    });
  }

  /**
   * PUT /api/health-data/:id
   * Update health data
   */
  async update(c: Context) {
    const user = getAuthenticatedUser(c);
    const id = c.req.param("id");
    const body = await c.req.json();
    const { measurementValue, measurementDate, memo } = body;

    logger.info("Update health data request", {
      userId: user.userId.toString(),
      healthDataId: id,
    });

    // Parse inputs
    const updateData: {
      measurementValue?: number;
      measurementDate?: Date;
      memo?: string;
    } = {};

    if (measurementValue !== undefined) {
      updateData.measurementValue = Number(measurementValue);
    }
    if (measurementDate) {
      updateData.measurementDate = new Date(measurementDate);
    }
    if (memo !== undefined) {
      updateData.memo = memo;
    }

    // Update health data
    const healthData = await this.healthDataService.updateHealthData(
      user.userId,
      BigInt(id),
      updateData,
    );

    return c.json({
      success: true,
      data: {
        healthDataId: healthData.healthDataId.toString(),
        dataTypeId: healthData.dataTypeId.toString(),
        dataTypeName: healthData.dataTypeName,
        unit: healthData.unit,
        measurementValue: healthData.measurementValue,
        measurementDate: healthData.measurementDate,
        memo: healthData.memo,
        message: "健康データを更新しました",
      },
    });
  }

  /**
   * DELETE /api/health-data/:id
   * Delete health data
   */
  async delete(c: Context) {
    const user = getAuthenticatedUser(c);
    const id = c.req.param("id");

    logger.info("Delete health data request", {
      userId: user.userId.toString(),
      healthDataId: id,
    });

    await this.healthDataService.deleteHealthData(user.userId, BigInt(id));

    return c.json({
      success: true,
      data: {
        message: "健康データを削除しました",
      },
    });
  }
}
