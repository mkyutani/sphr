/**
 * Audit Log Service
 * Handles logging of user operations for security and compliance
 */

import type { PostgresJsDatabase } from "https://esm.sh/drizzle-orm@0.29.0/postgres-js";
import { accessLog } from "@backend/models/schema.ts";
import { createLogger } from "@backend/utils/logger.ts";

const logger = createLogger("AuditLogService");

/**
 * Operation types for audit logging
 */
export enum AuditOperation {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  EXPORT = "EXPORT",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  REGISTER = "REGISTER",
}

/**
 * Target types for audit logging
 */
export enum AuditTargetType {
  HEALTH_DATA = "health_data",
  DATA_TYPE = "data_type",
  DATA_EXPORT = "data_export",
  USER = "user",
}

/**
 * Audit log entry data
 */
export interface AuditLogData {
  userId: bigint;
  operation: AuditOperation;
  targetType: AuditTargetType;
  targetId?: bigint;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit Log Service
 */
export class AuditLogService {
  constructor(private db: PostgresJsDatabase) {}

  /**
   * Log an operation
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await this.db.insert(accessLog).values({
        userId: data.userId,
        operation: data.operation,
        targetType: data.targetType,
        targetId: data.targetId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });

      logger.info("Audit log created", {
        userId: data.userId.toString(),
        operation: data.operation,
        targetType: data.targetType,
        targetId: data.targetId?.toString(),
      });
    } catch (error) {
      logger.error("Failed to create audit log", error as Error, {
        userId: data.userId.toString(),
        operation: data.operation,
      });
      // Don't throw error - audit log failure shouldn't break the operation
    }
  }

  /**
   * Get logs for a specific user
   */
  async getLogsByUser(
    userId: bigint,
    limit: number = 100,
    offset: number = 0,
  ) {
    const logs = await this.db
      .select()
      .from(accessLog)
      .where((t) => t.userId === userId)
      .orderBy((t) => t.createdAt)
      .limit(limit)
      .offset(offset);

    return logs;
  }

  /**
   * Get logs for a specific operation type
   */
  async getLogsByOperation(
    operation: AuditOperation,
    limit: number = 100,
    offset: number = 0,
  ) {
    const logs = await this.db
      .select()
      .from(accessLog)
      .where((t) => t.operation === operation)
      .orderBy((t) => t.createdAt)
      .limit(limit)
      .offset(offset);

    return logs;
  }

  /**
   * Get logs for a specific target
   */
  async getLogsByTarget(
    targetType: AuditTargetType,
    targetId: bigint,
    limit: number = 100,
  ) {
    const logs = await this.db
      .select()
      .from(accessLog)
      .where((t) => t.targetType === targetType && t.targetId === targetId)
      .orderBy((t) => t.createdAt)
      .limit(limit);

    return logs;
  }
}
