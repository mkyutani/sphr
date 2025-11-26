/**
 * Data Type Service
 * Handles data type master management (CRUD operations)
 */

import type { PostgresJsDatabase } from "https://esm.sh/drizzle-orm@0.29.0/postgres-js";
import { eq, and } from "https://esm.sh/drizzle-orm@0.29.0";
import { dataTypeMaster } from "@backend/models/schema.ts";
import { ConflictError, NotFoundError, ValidationError } from "@shared/types/errors.ts";
import { createLogger } from "@backend/utils/logger.ts";

const logger = createLogger("DataTypeService");

/**
 * Input for creating a data type
 */
export interface CreateDataTypeInput {
  dataTypeName: string;
  unit: string;
  displayOrder: number;
}

/**
 * Input for updating a data type
 */
export interface UpdateDataTypeInput {
  dataTypeName?: string;
  unit?: string;
  displayOrder?: number;
}

/**
 * Data Type Service
 */
export class DataTypeService {
  constructor(private db: PostgresJsDatabase) {}

  /**
   * Validate data type name
   */
  private validateDataTypeName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError("データ種類名は必須です");
    }

    if (name.length > 100) {
      throw new ValidationError("データ種類名は100文字以内である必要があります");
    }
  }

  /**
   * Validate unit
   */
  private validateUnit(unit: string): void {
    if (!unit || unit.trim().length === 0) {
      throw new ValidationError("単位は必須です");
    }

    if (unit.length > 20) {
      throw new ValidationError("単位は20文字以内である必要があります");
    }
  }

  /**
   * Check if data type name already exists
   */
  private async checkDuplicateName(
    dataTypeName: string,
    excludeId?: bigint,
  ): Promise<void> {
    const conditions = excludeId
      ? and(
        eq(dataTypeMaster.dataTypeName, dataTypeName),
        eq(dataTypeMaster.dataTypeId, excludeId),
      )
      : eq(dataTypeMaster.dataTypeName, dataTypeName);

    const existing = await this.db
      .select()
      .from(dataTypeMaster)
      .where(conditions)
      .limit(1);

    if (existing.length > 0 && existing[0].dataTypeId !== excludeId) {
      throw new ConflictError("このデータ種類名は既に登録されています");
    }
  }

  /**
   * Create a new data type
   */
  async createDataType(input: CreateDataTypeInput) {
    logger.info("Creating new data type", { dataTypeName: input.dataTypeName });

    // Validate input
    this.validateDataTypeName(input.dataTypeName);
    this.validateUnit(input.unit);

    // Check for duplicates
    await this.checkDuplicateName(input.dataTypeName);

    // Insert data type
    const result = await this.db
      .insert(dataTypeMaster)
      .values({
        dataTypeName: input.dataTypeName,
        unit: input.unit,
        displayOrder: input.displayOrder,
        isActive: true,
      })
      .returning();

    logger.info("Data type created", {
      dataTypeId: result[0].dataTypeId.toString(),
      dataTypeName: result[0].dataTypeName,
    });

    return result[0];
  }

  /**
   * Get all active data types (ordered by displayOrder)
   */
  async getAllActiveDataTypes() {
    const result = await this.db
      .select()
      .from(dataTypeMaster)
      .where(eq(dataTypeMaster.isActive, true))
      .orderBy(dataTypeMaster.displayOrder);

    return result;
  }

  /**
   * Get all data types including inactive (ordered by displayOrder)
   */
  async getAllDataTypes() {
    const result = await this.db
      .select()
      .from(dataTypeMaster)
      .orderBy(dataTypeMaster.displayOrder);

    return result;
  }

  /**
   * Get data type by ID
   */
  async getDataTypeById(dataTypeId: bigint) {
    const result = await this.db
      .select()
      .from(dataTypeMaster)
      .where(eq(dataTypeMaster.dataTypeId, dataTypeId))
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundError("データ種類が見つかりません");
    }

    return result[0];
  }

  /**
   * Update data type
   */
  async updateDataType(dataTypeId: bigint, input: UpdateDataTypeInput) {
    logger.info("Updating data type", { dataTypeId: dataTypeId.toString() });

    // Check if data type exists
    await this.getDataTypeById(dataTypeId);

    // Validate input if provided
    if (input.dataTypeName !== undefined) {
      this.validateDataTypeName(input.dataTypeName);
      // Check for duplicates (excluding current ID)
      await this.checkDuplicateName(input.dataTypeName, dataTypeId);
    }

    if (input.unit !== undefined) {
      this.validateUnit(input.unit);
    }

    // Build update object
    const updateData: Record<string, string | number> = {};
    if (input.dataTypeName !== undefined) {
      updateData.dataTypeName = input.dataTypeName;
    }
    if (input.unit !== undefined) {
      updateData.unit = input.unit;
    }
    if (input.displayOrder !== undefined) {
      updateData.displayOrder = input.displayOrder;
    }

    // Update data type
    const result = await this.db
      .update(dataTypeMaster)
      .set(updateData)
      .where(eq(dataTypeMaster.dataTypeId, dataTypeId))
      .returning();

    logger.info("Data type updated", {
      dataTypeId: result[0].dataTypeId.toString(),
      updates: Object.keys(updateData),
    });

    return result[0];
  }

  /**
   * Deactivate data type (logical delete)
   */
  async deactivateDataType(dataTypeId: bigint): Promise<void> {
    logger.info("Deactivating data type", { dataTypeId: dataTypeId.toString() });

    // Check if data type exists
    await this.getDataTypeById(dataTypeId);

    // Set isActive to false
    await this.db
      .update(dataTypeMaster)
      .set({ isActive: false })
      .where(eq(dataTypeMaster.dataTypeId, dataTypeId));

    logger.info("Data type deactivated", { dataTypeId: dataTypeId.toString() });
  }
}
