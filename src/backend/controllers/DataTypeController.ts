/**
 * Data Type Controller
 * Handles HTTP requests for data type management operations
 */

import type { Context } from "hono";
import { DataTypeService } from "@backend/services/DataTypeService.ts";
import { db } from "@backend/models/db.ts";
import { createLogger } from "@backend/utils/logger.ts";

const logger = createLogger("DataTypeController");

/**
 * Data Type Controller
 */
export class DataTypeController {
  private dataTypeService: DataTypeService;

  constructor() {
    this.dataTypeService = new DataTypeService(db);
  }

  /**
   * GET /api/data-types
   * Get all active data types
   */
  async getAllActive(c: Context) {
    logger.info("Get all active data types request");

    const dataTypes = await this.dataTypeService.getAllActiveDataTypes();

    return c.json({
      success: true,
      data: dataTypes.map((dt) => ({
        dataTypeId: dt.dataTypeId.toString(),
        dataTypeName: dt.dataTypeName,
        unit: dt.unit,
        displayOrder: dt.displayOrder,
        isActive: dt.isActive,
      })),
    });
  }

  /**
   * GET /api/data-types/all
   * Get all data types including inactive (for admin)
   */
  async getAll(c: Context) {
    logger.info("Get all data types request");

    const dataTypes = await this.dataTypeService.getAllDataTypes();

    return c.json({
      success: true,
      data: dataTypes.map((dt) => ({
        dataTypeId: dt.dataTypeId.toString(),
        dataTypeName: dt.dataTypeName,
        unit: dt.unit,
        displayOrder: dt.displayOrder,
        isActive: dt.isActive,
      })),
    });
  }

  /**
   * GET /api/data-types/:id
   * Get data type by ID
   */
  async getById(c: Context) {
    const id = c.req.param("id");
    logger.info("Get data type by ID request", { dataTypeId: id });

    const dataType = await this.dataTypeService.getDataTypeById(BigInt(id));

    return c.json({
      success: true,
      data: {
        dataTypeId: dataType.dataTypeId.toString(),
        dataTypeName: dataType.dataTypeName,
        unit: dataType.unit,
        displayOrder: dataType.displayOrder,
        isActive: dataType.isActive,
        createdAt: dataType.createdAt,
        updatedAt: dataType.updatedAt,
      },
    });
  }

  /**
   * POST /api/data-types
   * Create a new data type
   */
  async create(c: Context) {
    const body = await c.req.json();
    const { dataTypeName, unit, displayOrder } = body;

    logger.info("Create data type request", { dataTypeName });

    // Validate request body
    if (!dataTypeName || !unit || displayOrder === undefined) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "データ種類名、単位、表示順は必須です",
          },
        },
        400,
      );
    }

    // Create data type
    const dataType = await this.dataTypeService.createDataType({
      dataTypeName,
      unit,
      displayOrder,
    });

    return c.json(
      {
        success: true,
        data: {
          dataTypeId: dataType.dataTypeId.toString(),
          dataTypeName: dataType.dataTypeName,
          unit: dataType.unit,
          displayOrder: dataType.displayOrder,
          isActive: dataType.isActive,
          message: "データ種類を登録しました",
        },
      },
      201,
    );
  }

  /**
   * PUT /api/data-types/:id
   * Update data type
   */
  async update(c: Context) {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { dataTypeName, unit, displayOrder } = body;

    logger.info("Update data type request", { dataTypeId: id });

    // Update data type
    const dataType = await this.dataTypeService.updateDataType(BigInt(id), {
      dataTypeName,
      unit,
      displayOrder,
    });

    return c.json({
      success: true,
      data: {
        dataTypeId: dataType.dataTypeId.toString(),
        dataTypeName: dataType.dataTypeName,
        unit: dataType.unit,
        displayOrder: dataType.displayOrder,
        isActive: dataType.isActive,
        message: "データ種類を更新しました",
      },
    });
  }

  /**
   * PATCH /api/data-types/:id/deactivate
   * Deactivate data type (logical delete)
   */
  async deactivate(c: Context) {
    const id = c.req.param("id");

    logger.info("Deactivate data type request", { dataTypeId: id });

    await this.dataTypeService.deactivateDataType(BigInt(id));

    return c.json({
      success: true,
      data: {
        message: "データ種類を無効化しました",
      },
    });
  }
}
