/**
 * Export Service Unit Tests
 * Tests for CSV and PDF export functionality
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { beforeEach, describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { ExportService } from "@backend/services/ExportService.ts";
import { db } from "@backend/models/db.ts";

describe("ExportService", () => {
  let exportService: ExportService;
  let testUserId: bigint;
  let testDataTypeId: bigint;

  beforeEach(async () => {
    exportService = new ExportService(db);

    // Create test user
    const userResult = await db.execute(
      sql`INSERT INTO users (username, password_hash) VALUES ('export_test_user', 'hash') RETURNING user_id`,
    );
    testUserId = userResult.rows[0].user_id as bigint;

    // Create test data type
    const dataTypeResult = await db.execute(
      sql`INSERT INTO data_types (data_type_name, unit, display_order) VALUES ('体重', 'kg', 1) RETURNING data_type_id`,
    );
    testDataTypeId = dataTypeResult.rows[0].data_type_id as bigint;

    // Create test health data
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      await db.execute(
        sql`INSERT INTO health_data (user_id, data_type_id, value, measurement_date, memo) VALUES (${testUserId}, ${testDataTypeId}, ${(70 + i).toFixed(2)}, ${dateStr}, 'Test memo ${i}')`,
      );
    }
  });

  describe("generateCSV", () => {
    it("should generate CSV with headers and data", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 10);

      const csv = await exportService.generateCSV(testUserId, {
        startDate,
        endDate: today,
      });

      // Check CSV structure
      assertExists(csv);
      assertEquals(typeof csv, "string");

      // Check headers
      const lines = csv.split("\n");
      assertEquals(lines[0], "測定日,データ種類,測定値,単位,メモ");

      // Check data rows
      assertEquals(lines.length > 1, true);
    });

    it("should include all data within date range", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 10);

      const csv = await exportService.generateCSV(testUserId, {
        startDate,
        endDate: today,
      });

      const lines = csv.split("\n").filter((line) => line.trim() !== "");
      // Header + 5 data rows
      assertEquals(lines.length >= 6, true);
    });

    it("should filter by data type", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 10);

      const csv = await exportService.generateCSV(testUserId, {
        startDate,
        endDate: today,
        dataTypeId: testDataTypeId,
      });

      assertExists(csv);
      const lines = csv.split("\n").filter((line) => line.trim() !== "");
      assertEquals(lines.length >= 2, true); // At least header + 1 data row
    });

    it("should handle empty data", async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const csv = await exportService.generateCSV(testUserId, {
        startDate: futureDate,
        endDate: futureDate,
      });

      // Should return header only
      const lines = csv.split("\n").filter((line) => line.trim() !== "");
      assertEquals(lines.length, 1); // Header only
      assertEquals(lines[0], "測定日,データ種類,測定値,単位,メモ");
    });

    it("should escape commas in memo field", async () => {
      // Create data with comma in memo
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];

      await db.execute(
        sql`INSERT INTO health_data (user_id, data_type_id, value, measurement_date, memo) VALUES (${testUserId}, ${testDataTypeId}, '75.5', ${dateStr}, 'Test, with, commas')`,
      );

      const csv = await exportService.generateCSV(testUserId, {
        startDate: today,
        endDate: today,
      });

      // Check that memo with commas is properly quoted
      assertExists(csv);
      assertEquals(csv.includes('"Test, with, commas"'), true);
    });
  });

  describe("recordExportLog", () => {
    it("should record export log", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 10);

      await exportService.recordExportLog(testUserId, {
        format: "csv",
        startDate,
        endDate: today,
      });

      // Check log was created
      const logs = await db.execute(
        sql`SELECT * FROM export_logs WHERE user_id = ${testUserId}`,
      );

      assertEquals(logs.rows.length > 0, true);
      assertEquals(logs.rows[0].format, "csv");
    });

    it("should record PDF export log", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 10);

      await exportService.recordExportLog(testUserId, {
        format: "pdf",
        startDate,
        endDate: today,
      });

      // Check log was created
      const logs = await db.execute(
        sql`SELECT * FROM export_logs WHERE user_id = ${testUserId} AND format = 'pdf'`,
      );

      assertEquals(logs.rows.length > 0, true);
    });
  });

  describe("getExportHistory", () => {
    it("should get export history", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 10);

      // Create export logs
      await exportService.recordExportLog(testUserId, {
        format: "csv",
        startDate,
        endDate: today,
      });

      await exportService.recordExportLog(testUserId, {
        format: "pdf",
        startDate,
        endDate: today,
      });

      const history = await exportService.getExportHistory(testUserId, { limit: 10 });

      assertEquals(history.length >= 2, true);
      assertEquals(history[0].format === "csv" || history[0].format === "pdf", true);
    });

    it("should order by export date descending", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 10);

      // Create multiple logs
      await exportService.recordExportLog(testUserId, {
        format: "csv",
        startDate,
        endDate: today,
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      await exportService.recordExportLog(testUserId, {
        format: "pdf",
        startDate,
        endDate: today,
      });

      const history = await exportService.getExportHistory(testUserId, { limit: 10 });

      // Most recent should be first (PDF)
      assertEquals(history[0].format, "pdf");
    });

    it("should limit results", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 10);

      // Create 5 logs
      for (let i = 0; i < 5; i++) {
        await exportService.recordExportLog(testUserId, {
          format: "csv",
          startDate,
          endDate: today,
        });
      }

      const history = await exportService.getExportHistory(testUserId, { limit: 3 });

      assertEquals(history.length, 3);
    });
  });
});
