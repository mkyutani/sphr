/**
 * Database Schema Definition using Drizzle ORM
 * Based on design.md specifications
 */

import {
  bigserial,
  boolean,
  date,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "https://esm.sh/drizzle-orm@0.29.0/pg-core";

/**
 * Users table - システムユーザーの情報を管理
 */
export const users = pgTable(
  "users",
  {
    userId: bigserial("user_id", { mode: "bigint" }).primaryKey(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    usernameIdx: index("idx_users_username").on(table.username),
  }),
);

/**
 * Data Type Master table - 健康データの種類を定義
 */
export const dataTypeMaster = pgTable(
  "data_type_master",
  {
    dataTypeId: bigserial("data_type_id", { mode: "bigint" }).primaryKey(),
    dataTypeName: varchar("data_type_name", { length: 100 }).notNull(),
    unit: varchar("unit", { length: 20 }).notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    isActiveIdx: index("idx_data_type_master_is_active").on(table.isActive),
    displayOrderIdx: index("idx_data_type_master_display_order").on(table.displayOrder),
  }),
);

/**
 * Health Data table - ユーザーの健康データを記録
 */
export const healthData = pgTable(
  "health_data",
  {
    healthDataId: bigserial("health_data_id", { mode: "bigint" }).primaryKey(),
    userId: bigserial("user_id", { mode: "bigint" }).notNull().references(() => users.userId, {
      onDelete: "cascade",
    }),
    dataTypeId: bigserial("data_type_id", { mode: "bigint" }).notNull().references(
      () => dataTypeMaster.dataTypeId,
    ),
    measurementDate: date("measurement_date").notNull(),
    value: decimal("value", { precision: 10, scale: 2 }).notNull(),
    memo: text("memo"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserDataTypeDate: uniqueIndex("health_data_user_data_type_date_unique").on(
      table.userId,
      table.dataTypeId,
      table.measurementDate,
    ),
    userDateIdx: index("idx_health_data_user_date").on(table.userId, table.measurementDate),
    userTypeDateIdx: index("idx_health_data_user_type_date").on(
      table.userId,
      table.dataTypeId,
      table.measurementDate,
    ),
  }),
);

/**
 * Data Export table - データエクスポート履歴を記録
 */
export const dataExport = pgTable(
  "data_export",
  {
    exportId: bigserial("export_id", { mode: "bigint" }).primaryKey(),
    userId: bigserial("user_id", { mode: "bigint" }).notNull().references(() => users.userId, {
      onDelete: "cascade",
    }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    format: varchar("format", { length: 10 }).notNull(),
    exportedAt: timestamp("exported_at").notNull().defaultNow(),
  },
  (table) => ({
    userExportedAtIdx: index("idx_data_export_user").on(table.userId, table.exportedAt),
  }),
);

/**
 * Export Logs table - エクスポートログを記録
 */
export const exportLogs = pgTable(
  "export_logs",
  {
    exportLogId: bigserial("export_log_id", { mode: "bigint" }).primaryKey(),
    userId: bigserial("user_id", { mode: "bigint" }).notNull().references(() => users.userId, {
      onDelete: "cascade",
    }),
    format: varchar("format", { length: 10 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    exportedAt: timestamp("exported_at").notNull().defaultNow(),
  },
  (table) => ({
    userExportedAtIdx: index("idx_export_logs_user_exported_at").on(table.userId, table.exportedAt),
  }),
);

/**
 * Access Log table - 操作ログを記録
 */
export const accessLog = pgTable(
  "access_log",
  {
    logId: bigserial("log_id", { mode: "bigint" }).primaryKey(),
    userId: bigserial("user_id", { mode: "bigint" }).notNull().references(() => users.userId, {
      onDelete: "cascade",
    }),
    operation: varchar("operation", { length: 50 }).notNull(), // CREATE, UPDATE, DELETE, EXPORT
    targetType: varchar("target_type", { length: 50 }).notNull(), // health_data, data_export, etc.
    targetId: bigserial("target_id", { mode: "bigint" }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userCreatedAtIdx: index("idx_access_log_user_created_at").on(table.userId, table.createdAt),
    operationIdx: index("idx_access_log_operation").on(table.operation),
  }),
);

/**
 * Type definitions for TypeScript
 */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type DataType = typeof dataTypeMaster.$inferSelect;
export type NewDataType = typeof dataTypeMaster.$inferInsert;

export type HealthData = typeof healthData.$inferSelect;
export type NewHealthData = typeof healthData.$inferInsert;

export type DataExport = typeof dataExport.$inferSelect;
export type NewDataExport = typeof dataExport.$inferInsert;

export type ExportLog = typeof exportLogs.$inferSelect;
export type NewExportLog = typeof exportLogs.$inferInsert;

export type AccessLog = typeof accessLog.$inferSelect;
export type NewAccessLog = typeof accessLog.$inferInsert;
