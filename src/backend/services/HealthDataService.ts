/**
 * Health Data Service
 * Handles health data CRUD operations
 */

import type { PostgresJsDatabase } from "https://esm.sh/drizzle-orm@0.29.0/postgres-js";
import { eq, and, gte, lte, desc } from "https://esm.sh/drizzle-orm@0.29.0";
import { healthData, dataTypeMaster } from "@backend/models/schema.ts";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from "@shared/types/errors.ts";
import { createLogger } from "@backend/utils/logger.ts";
import { AuditLogService, AuditOperation, AuditTargetType } from "./AuditLogService.ts";

const logger = createLogger("HealthDataService");

/**
 * Input for creating health data
 */
export interface CreateHealthDataInput {
  dataTypeId: bigint;
  measurementValue: number;
  measurementDate: Date;
  memo?: string;
}

/**
 * Input for updating health data
 */
export interface UpdateHealthDataInput {
  measurementValue?: number;
  measurementDate?: Date;
  memo?: string;
}

/**
 * Filters for querying health data
 */
export interface HealthDataFilters {
  dataTypeId?: bigint;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Health data with data type information
 */
export interface HealthDataWithType {
  healthDataId: bigint;
  userId: bigint;
  dataTypeId: bigint;
  dataTypeName: string;
  unit: string;
  measurementValue: string;
  measurementDate: string;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Health data list response
 */
export interface HealthDataListResponse {
  data: HealthDataWithType[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Health Data Service
 */
export class HealthDataService {
  private auditLogService: AuditLogService;

  constructor(private db: PostgresJsDatabase) {
    this.auditLogService = new AuditLogService(db);
  }

  /**
   * Validate measurement value
   */
  private validateMeasurementValue(value: number): void {
    if (typeof value !== "number" || isNaN(value)) {
      throw new ValidationError("測定値は数値で入力してください");
    }

    if (value === 0) {
      throw new ValidationError("測定値は必須です");
    }

    if (value < 0) {
      throw new ValidationError("測定値は正の数である必要があります");
    }
  }

  /**
   * Validate measurement date
   */
  private validateMeasurementDate(date: Date): void {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new ValidationError("測定日は有効な日付である必要があります");
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (date > today) {
      throw new ValidationError("未来の日付は指定できません");
    }
  }

  /**
   * Verify data type exists
   */
  private async verifyDataTypeExists(dataTypeId: bigint): Promise<void> {
    const dataType = await this.db
      .select()
      .from(dataTypeMaster)
      .where(eq(dataTypeMaster.dataTypeId, dataTypeId))
      .limit(1);

    if (dataType.length === 0) {
      throw new NotFoundError("データ種類が見つかりません");
    }
  }

  /**
   * Check for duplicate entry
   */
  private async checkDuplicateEntry(
    userId: bigint,
    dataTypeId: bigint,
    measurementDate: Date,
    excludeId?: bigint,
  ): Promise<void> {
    const dateStr = measurementDate.toISOString().split("T")[0];

    const conditions = excludeId
      ? and(
        eq(healthData.userId, userId),
        eq(healthData.dataTypeId, dataTypeId),
        eq(healthData.measurementDate, dateStr),
      )
      : and(
        eq(healthData.userId, userId),
        eq(healthData.dataTypeId, dataTypeId),
        eq(healthData.measurementDate, dateStr),
      );

    const existing = await this.db
      .select()
      .from(healthData)
      .where(conditions)
      .limit(1);

    if (existing.length > 0 && existing[0].healthDataId !== excludeId) {
      throw new ConflictError("この日付のデータは既に登録されています");
    }
  }

  /**
   * Verify ownership
   */
  private async verifyOwnership(userId: bigint, healthDataId: bigint): Promise<void> {
    const data = await this.db
      .select()
      .from(healthData)
      .where(eq(healthData.healthDataId, healthDataId))
      .limit(1);

    if (data.length === 0) {
      throw new NotFoundError("健康データが見つかりません");
    }

    if (data[0].userId !== userId) {
      throw new AuthorizationError("このデータへのアクセス権限がありません");
    }
  }

  /**
   * Create health data
   */
  async createHealthData(
    userId: bigint,
    input: CreateHealthDataInput,
  ): Promise<HealthDataWithType> {
    logger.info("Creating health data", { userId: userId.toString() });

    // Validate input
    this.validateMeasurementValue(input.measurementValue);
    this.validateMeasurementDate(input.measurementDate);

    // Verify data type exists
    await this.verifyDataTypeExists(input.dataTypeId);

    // Check for duplicates
    await this.checkDuplicateEntry(userId, input.dataTypeId, input.measurementDate);

    // Format date as YYYY-MM-DD
    const dateStr = input.measurementDate.toISOString().split("T")[0];

    // Insert health data
    const result = await this.db
      .insert(healthData)
      .values({
        userId,
        dataTypeId: input.dataTypeId,
        value: input.measurementValue.toFixed(2),
        measurementDate: dateStr,
        memo: input.memo,
      })
      .returning();

    logger.info("Health data created", {
      healthDataId: result[0].healthDataId.toString(),
      userId: userId.toString(),
    });

    // Record audit log
    await this.auditLogService.log({
      userId,
      operation: AuditOperation.CREATE,
      targetType: AuditTargetType.HEALTH_DATA,
      targetId: result[0].healthDataId,
    });

    // Return with data type information
    return await this.getHealthDataById(userId, result[0].healthDataId);
  }

  /**
   * Update health data
   */
  async updateHealthData(
    userId: bigint,
    healthDataId: bigint,
    input: UpdateHealthDataInput,
  ): Promise<HealthDataWithType> {
    logger.info("Updating health data", {
      healthDataId: healthDataId.toString(),
      userId: userId.toString(),
    });

    // Verify ownership
    await this.verifyOwnership(userId, healthDataId);

    // Validate input if provided
    if (input.measurementValue !== undefined) {
      this.validateMeasurementValue(input.measurementValue);
    }

    if (input.measurementDate !== undefined) {
      this.validateMeasurementDate(input.measurementDate);
    }

    // Build update object
    const updateData: Record<string, string | number> = {};

    if (input.measurementValue !== undefined) {
      updateData.value = input.measurementValue.toFixed(2);
    }

    if (input.measurementDate !== undefined) {
      updateData.measurementDate = input.measurementDate.toISOString().split("T")[0];
    }

    if (input.memo !== undefined) {
      updateData.memo = input.memo;
    }

    // Update health data
    await this.db
      .update(healthData)
      .set(updateData)
      .where(eq(healthData.healthDataId, healthDataId));

    logger.info("Health data updated", {
      healthDataId: healthDataId.toString(),
      updates: Object.keys(updateData),
    });

    // Record audit log
    await this.auditLogService.log({
      userId,
      operation: AuditOperation.UPDATE,
      targetType: AuditTargetType.HEALTH_DATA,
      targetId: healthDataId,
    });

    return await this.getHealthDataById(userId, healthDataId);
  }

  /**
   * Delete health data (physical delete)
   */
  async deleteHealthData(userId: bigint, healthDataId: bigint): Promise<void> {
    logger.info("Deleting health data", {
      healthDataId: healthDataId.toString(),
      userId: userId.toString(),
    });

    // Verify ownership
    await this.verifyOwnership(userId, healthDataId);

    // Delete health data
    await this.db
      .delete(healthData)
      .where(eq(healthData.healthDataId, healthDataId));

    logger.info("Health data deleted", { healthDataId: healthDataId.toString() });

    // Record audit log
    await this.auditLogService.log({
      userId,
      operation: AuditOperation.DELETE,
      targetType: AuditTargetType.HEALTH_DATA,
      targetId: healthDataId,
    });
  }

  /**
   * Get health data by ID
   */
  async getHealthDataById(userId: bigint, healthDataId: bigint): Promise<HealthDataWithType> {
    // Verify ownership
    await this.verifyOwnership(userId, healthDataId);

    // Get health data with data type information
    const result = await this.db
      .select({
        healthDataId: healthData.healthDataId,
        userId: healthData.userId,
        dataTypeId: healthData.dataTypeId,
        dataTypeName: dataTypeMaster.dataTypeName,
        unit: dataTypeMaster.unit,
        measurementValue: healthData.value,
        measurementDate: healthData.measurementDate,
        memo: healthData.memo,
        createdAt: healthData.createdAt,
        updatedAt: healthData.updatedAt,
      })
      .from(healthData)
      .innerJoin(dataTypeMaster, eq(healthData.dataTypeId, dataTypeMaster.dataTypeId))
      .where(eq(healthData.healthDataId, healthDataId))
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundError("健康データが見つかりません");
    }

    return result[0] as HealthDataWithType;
  }

  /**
   * Get health data with filters
   */
  async getHealthData(
    userId: bigint,
    filters: HealthDataFilters = {},
  ): Promise<HealthDataListResponse> {
    logger.debug("Getting health data", { userId: userId.toString(), filters });

    // Build where conditions
    const conditions = [eq(healthData.userId, userId)];

    if (filters.dataTypeId) {
      conditions.push(eq(healthData.dataTypeId, filters.dataTypeId));
    }

    if (filters.startDate) {
      const startDateStr = filters.startDate.toISOString().split("T")[0];
      conditions.push(gte(healthData.measurementDate, startDateStr));
    }

    if (filters.endDate) {
      const endDateStr = filters.endDate.toISOString().split("T")[0];
      conditions.push(lte(healthData.measurementDate, endDateStr));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await this.db
      .select({ count: healthData.healthDataId })
      .from(healthData)
      .where(whereClause);

    const total = countResult.length;

    // Get data with pagination
    const limit = filters.limit ?? 30;
    const offset = filters.offset ?? 0;

    const result = await this.db
      .select({
        healthDataId: healthData.healthDataId,
        userId: healthData.userId,
        dataTypeId: healthData.dataTypeId,
        dataTypeName: dataTypeMaster.dataTypeName,
        unit: dataTypeMaster.unit,
        measurementValue: healthData.value,
        measurementDate: healthData.measurementDate,
        memo: healthData.memo,
        createdAt: healthData.createdAt,
        updatedAt: healthData.updatedAt,
      })
      .from(healthData)
      .innerJoin(dataTypeMaster, eq(healthData.dataTypeId, dataTypeMaster.dataTypeId))
      .where(whereClause)
      .orderBy(desc(healthData.measurementDate))
      .limit(limit)
      .offset(offset);

    return {
      data: result as HealthDataWithType[],
      total,
      limit,
      offset,
    };
  }
}
