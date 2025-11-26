/**
 * Export Service
 * Handles data export operations (CSV and PDF)
 */

import type { PostgresJsDatabase } from "https://esm.sh/drizzle-orm@0.29.0/postgres-js";
import { eq, and, gte, lte, desc } from "https://esm.sh/drizzle-orm@0.29.0";
import { sql as drizzleSql } from "https://esm.sh/drizzle-orm@0.29.0";
import { healthData, dataTypeMaster, exportLogs } from "@backend/models/schema.ts";
import { createLogger } from "@backend/utils/logger.ts";

const logger = createLogger("ExportService");

/**
 * Export filters
 */
export interface ExportFilters {
  startDate: Date;
  endDate: Date;
  dataTypeId?: bigint;
}

/**
 * Export log input
 */
export interface ExportLogInput {
  format: "csv" | "pdf";
  startDate: Date;
  endDate: Date;
  dataTypeId?: bigint;
}

/**
 * Export history item
 */
export interface ExportHistoryItem {
  exportLogId: bigint;
  userId: bigint;
  format: string;
  startDate: string;
  endDate: string;
  exportedAt: Date;
}

/**
 * Export history filters
 */
export interface ExportHistoryFilters {
  limit?: number;
  offset?: number;
}

/**
 * Health data for export
 */
interface ExportHealthData {
  measurementDate: string;
  dataTypeName: string;
  value: string;
  unit: string;
  memo: string | null;
}

/**
 * Export Service
 */
export class ExportService {
  constructor(private db: PostgresJsDatabase) {}

  /**
   * Generate CSV data
   */
  async generateCSV(userId: bigint, filters: ExportFilters): Promise<string> {
    logger.info("Generating CSV", { userId: userId.toString() });

    // Get health data
    const data = await this.getHealthDataForExport(userId, filters);

    // Build CSV
    const header = "測定日,データ種類,測定値,単位,メモ";
    const rows = data.map((item) => {
      const memo = item.memo ? this.escapeCSV(item.memo) : "";
      return `${item.measurementDate},${item.dataTypeName},${item.value},${item.unit},${memo}`;
    });

    return [header, ...rows].join("\n");
  }

  /**
   * Escape CSV field
   */
  private escapeCSV(field: string): string {
    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Get health data for export
   */
  private async getHealthDataForExport(
    userId: bigint,
    filters: ExportFilters,
  ): Promise<ExportHealthData[]> {
    const conditions = [eq(healthData.userId, userId)];

    // Date range
    const startDateStr = filters.startDate.toISOString().split("T")[0];
    const endDateStr = filters.endDate.toISOString().split("T")[0];
    conditions.push(gte(healthData.measurementDate, startDateStr));
    conditions.push(lte(healthData.measurementDate, endDateStr));

    // Data type filter
    if (filters.dataTypeId) {
      conditions.push(eq(healthData.dataTypeId, filters.dataTypeId));
    }

    const whereClause = and(...conditions);

    const result = await this.db
      .select({
        measurementDate: healthData.measurementDate,
        dataTypeName: dataTypeMaster.dataTypeName,
        value: healthData.value,
        unit: dataTypeMaster.unit,
        memo: healthData.memo,
      })
      .from(healthData)
      .innerJoin(dataTypeMaster, eq(healthData.dataTypeId, dataTypeMaster.dataTypeId))
      .where(whereClause)
      .orderBy(healthData.measurementDate);

    return result as ExportHealthData[];
  }

  /**
   * Record export log
   */
  async recordExportLog(userId: bigint, input: ExportLogInput): Promise<void> {
    logger.info("Recording export log", {
      userId: userId.toString(),
      format: input.format,
    });

    const startDateStr = input.startDate.toISOString().split("T")[0];
    const endDateStr = input.endDate.toISOString().split("T")[0];

    await this.db.insert(exportLogs).values({
      userId,
      format: input.format,
      startDate: startDateStr,
      endDate: endDateStr,
    });
  }

  /**
   * Get export history
   */
  async getExportHistory(
    userId: bigint,
    filters: ExportHistoryFilters = {},
  ): Promise<ExportHistoryItem[]> {
    logger.debug("Getting export history", { userId: userId.toString() });

    const limit = filters.limit ?? 30;
    const offset = filters.offset ?? 0;

    const result = await this.db
      .select({
        exportLogId: exportLogs.exportLogId,
        userId: exportLogs.userId,
        format: exportLogs.format,
        startDate: exportLogs.startDate,
        endDate: exportLogs.endDate,
        exportedAt: exportLogs.exportedAt,
      })
      .from(exportLogs)
      .where(eq(exportLogs.userId, userId))
      .orderBy(desc(exportLogs.exportedAt))
      .limit(limit)
      .offset(offset);

    return result as ExportHistoryItem[];
  }

  /**
   * Generate PDF data
   * Note: This is a placeholder. Full PDF generation with charts
   * requires a PDF library like @react-pdf/renderer or pdfkit.
   * For now, we'll generate a simple text-based PDF representation.
   */
  async generatePDF(userId: bigint, filters: ExportFilters): Promise<Uint8Array> {
    logger.info("Generating PDF", { userId: userId.toString() });

    // Get health data
    const data = await this.getHealthDataForExport(userId, filters);

    // Get statistics for the period
    const stats = await this.getStatisticsForPDF(userId, filters);

    // Build simple PDF content (text-based for now)
    // In a real implementation, use a proper PDF library
    const content = this.buildPDFContent(data, stats, filters);

    // Convert to bytes
    return new TextEncoder().encode(content);
  }

  /**
   * Get statistics for PDF
   */
  private async getStatisticsForPDF(
    userId: bigint,
    filters: ExportFilters,
  ): Promise<Record<string, { max: number; min: number; avg: number; count: number }>> {
    const conditions = [eq(healthData.userId, userId)];

    const startDateStr = filters.startDate.toISOString().split("T")[0];
    const endDateStr = filters.endDate.toISOString().split("T")[0];
    conditions.push(gte(healthData.measurementDate, startDateStr));
    conditions.push(lte(healthData.measurementDate, endDateStr));

    if (filters.dataTypeId) {
      conditions.push(eq(healthData.dataTypeId, filters.dataTypeId));
    }

    const whereClause = and(...conditions);

    const result = await this.db
      .select({
        dataTypeName: dataTypeMaster.dataTypeName,
        max: drizzleSql<number>`MAX(${healthData.value}::numeric)`,
        min: drizzleSql<number>`MIN(${healthData.value}::numeric)`,
        avg: drizzleSql<number>`ROUND(AVG(${healthData.value}::numeric), 2)`,
        count: drizzleSql<number>`COUNT(*)`,
      })
      .from(healthData)
      .innerJoin(dataTypeMaster, eq(healthData.dataTypeId, dataTypeMaster.dataTypeId))
      .where(whereClause)
      .groupBy(dataTypeMaster.dataTypeName);

    const stats: Record<string, { max: number; min: number; avg: number; count: number }> = {};
    for (const row of result) {
      stats[row.dataTypeName] = {
        max: row.max,
        min: row.min,
        avg: row.avg,
        count: row.count,
      };
    }

    return stats;
  }

  /**
   * Build PDF content (text-based)
   */
  private buildPDFContent(
    data: ExportHealthData[],
    stats: Record<string, { max: number; min: number; avg: number; count: number }>,
    filters: ExportFilters,
  ): string {
    const startDate = filters.startDate.toISOString().split("T")[0];
    const endDate = filters.endDate.toISOString().split("T")[0];

    let content = "健康データレポート\n";
    content += "==================\n\n";
    content += `期間: ${startDate} 〜 ${endDate}\n\n`;

    // Statistics section
    content += "統計情報\n";
    content += "--------\n";
    for (const [dataTypeName, stat] of Object.entries(stats)) {
      content += `\n${dataTypeName}:\n`;
      content += `  最大値: ${stat.max}\n`;
      content += `  最小値: ${stat.min}\n`;
      content += `  平均値: ${stat.avg}\n`;
      content += `  データ件数: ${stat.count}\n`;
    }

    // Data table
    content += "\n\nデータ一覧\n";
    content += "----------\n";
    content += "測定日       | データ種類 | 測定値 | 単位 | メモ\n";
    content += "-------------|-----------|--------|------|-----\n";

    for (const item of data) {
      const memo = item.memo || "";
      content += `${item.measurementDate} | ${item.dataTypeName} | ${item.value} | ${item.unit} | ${memo}\n`;
    }

    content += "\n\n生成日時: " + new Date().toISOString() + "\n";

    return content;
  }
}
