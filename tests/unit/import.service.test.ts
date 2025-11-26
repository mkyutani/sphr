/**
 * Import Service Unit Tests
 * Tests for CSV import functionality
 */

import {
  assertEquals,
  assertExists,
  assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { beforeEach, describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { ImportService } from "@backend/services/ImportService.ts";
import { db } from "@backend/models/db.ts";
import { ValidationError } from "@shared/types/errors.ts";

describe("ImportService", () => {
  let importService: ImportService;
  let testUserId: bigint;

  beforeEach(async () => {
    importService = new ImportService(db);

    // Create test user
    const userResult = await db.execute(
      sql`INSERT INTO users (username, password_hash) VALUES ('import_test_user', 'hash') RETURNING user_id`,
    );
    testUserId = userResult.rows[0].user_id as bigint;
  });

  describe("parseCSV", () => {
    it("should parse valid CSV data", () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
2024-01-01,体重,70.5,kg,朝測定
2024-01-02,体重,70.3,kg,朝測定`;

      const result = importService.parseCSV(csv);

      assertEquals(result.length, 2);
      assertEquals(result[0].measurementDate, "2024-01-01");
      assertEquals(result[0].dataTypeName, "体重");
      assertEquals(result[0].measurementValue, "70.5");
      assertEquals(result[0].unit, "kg");
      assertEquals(result[0].memo, "朝測定");
    });

    it("should handle CSV with different column order", () => {
      const csv = `データ種類,測定日,測定値,単位,メモ
体重,2024-01-01,70.5,kg,朝測定`;

      const result = importService.parseCSV(csv);

      assertEquals(result.length, 1);
      assertEquals(result[0].dataTypeName, "体重");
      assertEquals(result[0].measurementDate, "2024-01-01");
    });

    it("should handle empty memo field", () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
2024-01-01,体重,70.5,kg,`;

      const result = importService.parseCSV(csv);

      assertEquals(result.length, 1);
      assertEquals(result[0].memo, "");
    });

    it("should handle CSV without memo column", () => {
      const csv = `測定日,データ種類,測定値,単位
2024-01-01,体重,70.5,kg`;

      const result = importService.parseCSV(csv);

      assertEquals(result.length, 1);
      assertEquals(result[0].memo, "");
    });

    it("should throw error if required columns are missing", () => {
      const csv = `測定日,データ種類
2024-01-01,体重`;

      assertRejects(
        () => Promise.resolve(importService.parseCSV(csv)),
        ValidationError,
        "必須カラムが不足しています",
      );
    });

    it("should handle quoted fields with commas", () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
2024-01-01,体重,70.5,kg,"朝測定, 空腹時"`;

      const result = importService.parseCSV(csv);

      assertEquals(result.length, 1);
      assertEquals(result[0].memo, "朝測定, 空腹時");
    });

    it("should skip empty rows", () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
2024-01-01,体重,70.5,kg,朝測定

2024-01-02,体重,70.3,kg,朝測定`;

      const result = importService.parseCSV(csv);

      assertEquals(result.length, 2);
    });
  });

  describe("validateImportRow", () => {
    it("should validate valid row", () => {
      const row = {
        measurementDate: "2024-01-01",
        dataTypeName: "体重",
        measurementValue: "70.5",
        unit: "kg",
        memo: "朝測定",
      };

      const errors = importService.validateImportRow(row, 1);

      assertEquals(errors.length, 0);
    });

    it("should return error for invalid date", () => {
      const row = {
        measurementDate: "invalid-date",
        dataTypeName: "体重",
        measurementValue: "70.5",
        unit: "kg",
        memo: "",
      };

      const errors = importService.validateImportRow(row, 1);

      assertEquals(errors.length, 1);
      assertEquals(errors[0].row, 1);
      assertEquals(errors[0].field, "測定日");
    });

    it("should return error for future date", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const dateStr = futureDate.toISOString().split("T")[0];

      const row = {
        measurementDate: dateStr,
        dataTypeName: "体重",
        measurementValue: "70.5",
        unit: "kg",
        memo: "",
      };

      const errors = importService.validateImportRow(row, 1);

      assertEquals(errors.length, 1);
      assertEquals(errors[0].field, "測定日");
    });

    it("should return error for invalid measurement value", () => {
      const row = {
        measurementDate: "2024-01-01",
        dataTypeName: "体重",
        measurementValue: "not-a-number",
        unit: "kg",
        memo: "",
      };

      const errors = importService.validateImportRow(row, 1);

      assertEquals(errors.length, 1);
      assertEquals(errors[0].field, "測定値");
    });

    it("should return error for negative measurement value", () => {
      const row = {
        measurementDate: "2024-01-01",
        dataTypeName: "体重",
        measurementValue: "-10",
        unit: "kg",
        memo: "",
      };

      const errors = importService.validateImportRow(row, 1);

      assertEquals(errors.length, 1);
      assertEquals(errors[0].field, "測定値");
    });

    it("should return error for missing required fields", () => {
      const row = {
        measurementDate: "",
        dataTypeName: "",
        measurementValue: "",
        unit: "",
        memo: "",
      };

      const errors = importService.validateImportRow(row, 1);

      assertEquals(errors.length >= 3, true); // At least 3 errors
    });

    it("should return multiple errors for multiple issues", () => {
      const row = {
        measurementDate: "invalid",
        dataTypeName: "",
        measurementValue: "not-a-number",
        unit: "",
        memo: "",
      };

      const errors = importService.validateImportRow(row, 1);

      assertEquals(errors.length >= 3, true);
    });
  });

  describe("importHealthData", () => {
    it("should import valid CSV data", async () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
2024-01-01,血圧上,120,mmHg,朝測定
2024-01-02,血圧上,118,mmHg,朝測定`;

      const result = await importService.importHealthData(testUserId, csv);

      assertEquals(result.success, true);
      assertEquals(result.successCount, 2);
      assertEquals(result.failureCount, 0);
      assertEquals(result.errors.length, 0);
    });

    it("should handle data type matching", async () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
2024-01-01,血圧上,120,mmHg,朝測定
2024-01-02,体重,70.5,kg,朝測定`;

      const result = await importService.importHealthData(testUserId, csv);

      assertEquals(result.success, true);
      assertEquals(result.successCount >= 0, true);
    });

    it("should return errors for invalid data", async () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
invalid-date,血圧上,120,mmHg,朝測定
2024-01-02,血圧上,not-a-number,mmHg,朝測定`;

      const result = await importService.importHealthData(testUserId, csv);

      assertEquals(result.success, false);
      assertEquals(result.failureCount, 2);
      assertEquals(result.errors.length, 2);
    });

    it("should skip rows with unknown data types", async () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
2024-01-01,未知のデータ種類,100,unit,メモ`;

      const result = await importService.importHealthData(testUserId, csv);

      assertEquals(result.success, false);
      assertEquals(result.failureCount, 1);
      assertEquals(result.errors.length, 1);
      assertEquals(result.errors[0].message.includes("データ種類"), true);
    });

    it("should handle duplicate entries", async () => {
      // First import
      const csv1 = `測定日,データ種類,測定値,単位,メモ
2024-01-01,血圧上,120,mmHg,朝測定`;

      await importService.importHealthData(testUserId, csv1);

      // Try to import duplicate
      const csv2 = `測定日,データ種類,測定値,単位,メモ
2024-01-01,血圧上,118,mmHg,夜測定`;

      const result = await importService.importHealthData(testUserId, csv2);

      assertEquals(result.failureCount, 1);
      assertEquals(result.errors[0].message.includes("既に登録"), true);
    });

    it("should generate import report", async () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
2024-01-01,血圧上,120,mmHg,朝測定
invalid-date,血圧上,120,mmHg,朝測定
2024-01-03,血圧上,122,mmHg,朝測定`;

      const result = await importService.importHealthData(testUserId, csv);

      assertExists(result.successCount);
      assertExists(result.failureCount);
      assertEquals(result.successCount + result.failureCount, 3);
    });
  });
});
