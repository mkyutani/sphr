/**
 * Import Service
 * Handles CSV data import operations
 */

import type { PostgresJsDatabase } from "https://esm.sh/drizzle-orm@0.29.0/postgres-js";
import { eq, and } from "https://esm.sh/drizzle-orm@0.29.0";
import { healthData, dataTypeMaster } from "@backend/models/schema.ts";
import { ValidationError } from "@shared/types/errors.ts";
import { createLogger } from "@backend/utils/logger.ts";
import { AuditLogService, AuditOperation, AuditTargetType } from "./AuditLogService.ts";

const logger = createLogger("ImportService");

/**
 * CSV row structure
 */
export interface CSVRow {
  measurementDate: string;
  dataTypeName: string;
  measurementValue: string;
  unit: string;
  memo: string;
}

/**
 * Import error
 */
export interface ImportError {
  row: number;
  field: string;
  message: string;
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors: ImportError[];
}

/**
 * Import Service
 */
export class ImportService {
  private auditLogService: AuditLogService;

  constructor(private db: PostgresJsDatabase) {
    this.auditLogService = new AuditLogService(db);
  }

  /**
   * Parse CSV data
   */
  parseCSV(csvData: string): CSVRow[] {
    const lines = csvData.split("\n").filter((line) => line.trim() !== "");

    if (lines.length === 0) {
      throw new ValidationError("CSVファイルが空です");
    }

    // Parse header
    const header = this.parseCSVLine(lines[0]);
    const columnMap = this.mapColumns(header);

    // Validate required columns
    this.validateRequiredColumns(columnMap);

    // Parse data rows
    const rows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = this.parseCSVLine(lines[i]);

      if (fields.length === 0 || fields.every((f) => f === "")) {
        continue; // Skip empty rows
      }

      rows.push({
        measurementDate: fields[columnMap.measurementDate] || "",
        dataTypeName: fields[columnMap.dataTypeName] || "",
        measurementValue: fields[columnMap.measurementValue] || "",
        unit: fields[columnMap.unit] || "",
        memo: fields[columnMap.memo] || "",
      });
    }

    return rows;
  }

  /**
   * Parse CSV line (handle quoted fields)
   */
  private parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // Field separator
        fields.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }

    // Add last field
    fields.push(currentField.trim());

    return fields;
  }

  /**
   * Map column names to indices
   */
  private mapColumns(header: string[]): Record<string, number> {
    const columnMap: Record<string, number> = {
      measurementDate: -1,
      dataTypeName: -1,
      measurementValue: -1,
      unit: -1,
      memo: -1,
    };

    for (let i = 0; i < header.length; i++) {
      const col = header[i].trim();

      if (col === "測定日") {
        columnMap.measurementDate = i;
      } else if (col === "データ種類") {
        columnMap.dataTypeName = i;
      } else if (col === "測定値") {
        columnMap.measurementValue = i;
      } else if (col === "単位") {
        columnMap.unit = i;
      } else if (col === "メモ") {
        columnMap.memo = i;
      }
    }

    return columnMap;
  }

  /**
   * Validate required columns exist
   */
  private validateRequiredColumns(columnMap: Record<string, number>): void {
    const required = ["measurementDate", "dataTypeName", "measurementValue", "unit"];
    const missing = required.filter((col) => columnMap[col] === -1);

    if (missing.length > 0) {
      throw new ValidationError(
        `必須カラムが不足しています: ${missing.join(", ")}`,
      );
    }
  }

  /**
   * Validate import row
   */
  validateImportRow(row: CSVRow, rowNumber: number): ImportError[] {
    const errors: ImportError[] = [];

    // Validate measurement date
    if (!row.measurementDate || row.measurementDate.trim() === "") {
      errors.push({
        row: rowNumber,
        field: "測定日",
        message: "測定日は必須です",
      });
    } else {
      const date = new Date(row.measurementDate);
      if (isNaN(date.getTime())) {
        errors.push({
          row: rowNumber,
          field: "測定日",
          message: "測定日の形式が正しくありません",
        });
      } else {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (date > today) {
          errors.push({
            row: rowNumber,
            field: "測定日",
            message: "未来の日付は指定できません",
          });
        }
      }
    }

    // Validate data type name
    if (!row.dataTypeName || row.dataTypeName.trim() === "") {
      errors.push({
        row: rowNumber,
        field: "データ種類",
        message: "データ種類は必須です",
      });
    }

    // Validate measurement value
    if (!row.measurementValue || row.measurementValue.trim() === "") {
      errors.push({
        row: rowNumber,
        field: "測定値",
        message: "測定値は必須です",
      });
    } else {
      const value = Number(row.measurementValue);
      if (isNaN(value)) {
        errors.push({
          row: rowNumber,
          field: "測定値",
          message: "測定値は数値である必要があります",
        });
      } else if (value < 0) {
        errors.push({
          row: rowNumber,
          field: "測定値",
          message: "測定値は正の数である必要があります",
        });
      }
    }

    // Validate unit
    if (!row.unit || row.unit.trim() === "") {
      errors.push({
        row: rowNumber,
        field: "単位",
        message: "単位は必須です",
      });
    }

    return errors;
  }

  /**
   * Import health data from CSV
   */
  async importHealthData(userId: bigint, csvData: string): Promise<ImportResult> {
    logger.info("Importing health data from CSV", { userId: userId.toString() });

    const result: ImportResult = {
      success: true,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    try {
      // Parse CSV
      const rows = this.parseCSV(csvData);

      // Get all data types for matching
      const dataTypes = await this.db.select().from(dataTypeMaster);
      const dataTypeMap = new Map(
        dataTypes.map((dt) => [dt.dataTypeName, dt.dataTypeId]),
      );

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 because row 1 is header

        // Validate row
        const validationErrors = this.validateImportRow(row, rowNumber);
        if (validationErrors.length > 0) {
          result.errors.push(...validationErrors);
          result.failureCount++;
          continue;
        }

        // Match data type
        const dataTypeId = dataTypeMap.get(row.dataTypeName);
        if (!dataTypeId) {
          result.errors.push({
            row: rowNumber,
            field: "データ種類",
            message: `データ種類「${row.dataTypeName}」が見つかりません`,
          });
          result.failureCount++;
          continue;
        }

        // Check for duplicates
        const dateStr = new Date(row.measurementDate).toISOString().split("T")[0];
        const existing = await this.db
          .select()
          .from(healthData)
          .where(
            and(
              eq(healthData.userId, userId),
              eq(healthData.dataTypeId, dataTypeId),
              eq(healthData.measurementDate, dateStr),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          result.errors.push({
            row: rowNumber,
            field: "測定日",
            message: `この日付のデータは既に登録されています`,
          });
          result.failureCount++;
          continue;
        }

        // Insert health data
        try {
          const value = Number(row.measurementValue).toFixed(2);

          await this.db.insert(healthData).values({
            userId,
            dataTypeId,
            value,
            measurementDate: dateStr,
            memo: row.memo || null,
          });

          result.successCount++;

          // Record audit log
          await this.auditLogService.log({
            userId,
            operation: AuditOperation.CREATE,
            targetType: AuditTargetType.HEALTH_DATA,
            targetId: BigInt(0), // We don't have the ID here, use 0 for import
          });
        } catch (error) {
          logger.error("Failed to insert health data", { error, row });
          result.errors.push({
            row: rowNumber,
            field: "全体",
            message: "データの登録に失敗しました",
          });
          result.failureCount++;
        }
      }

      // Update success flag
      if (result.failureCount > 0) {
        result.success = false;
      }

      logger.info("Import completed", {
        successCount: result.successCount,
        failureCount: result.failureCount,
      });

      return result;
    } catch (error) {
      logger.error("CSV import failed", { error });

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new ValidationError("CSVファイルの解析に失敗しました");
    }
  }
}
