/**
 * Analysis Service Tests
 * Tests for statistical analysis and graph data generation
 */

import { assertEquals } from "std/assert/mod.ts";
import { AnalysisService } from "@backend/services/AnalysisService.ts";
import { HealthDataService } from "@backend/services/HealthDataService.ts";
import { DataTypeService } from "@backend/services/DataTypeService.ts";
import { AuthService } from "@backend/services/AuthService.ts";
import { closeConnection, db, sql } from "@backend/models/db.ts";

// Test user and data type
let testUserId: bigint;
let testDataTypeId: bigint;

// Setup: Create test user, data type, and sample data
async function setupTestData() {
  await sql`DELETE FROM health_data WHERE user_id IN (SELECT user_id FROM users WHERE username = 'analysis_test')`;
  await sql`DELETE FROM users WHERE username = 'analysis_test'`;
  await sql`DELETE FROM data_type_master WHERE data_type_name = 'test_血圧分析'`;

  const authService = new AuthService(db);
  const user = await authService.register("analysis_test", "TestPassword123!");
  testUserId = user.userId;

  const dataTypeService = new DataTypeService(db);
  const dataType = await dataTypeService.createDataType({
    dataTypeName: "test_血圧分析",
    unit: "mmHg",
    displayOrder: 1,
  });
  testDataTypeId = dataType.dataTypeId;

  // Create sample health data
  const healthDataService = new HealthDataService(db);
  const dates = ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"];
  const values = [120, 125, 118, 130, 122];

  for (let i = 0; i < dates.length; i++) {
    await healthDataService.createHealthData(testUserId, {
      dataTypeId: testDataTypeId,
      measurementValue: values[i],
      measurementDate: new Date(dates[i]),
    });
  }
}

// Cleanup
async function cleanupTestData() {
  await sql`DELETE FROM health_data WHERE user_id IN (SELECT user_id FROM users WHERE username = 'analysis_test')`;
  await sql`DELETE FROM users WHERE username = 'analysis_test'`;
  await sql`DELETE FROM data_type_master WHERE data_type_name = 'test_血圧分析'`;
}

Deno.test({
  name: "Setup: Create test data",
  async fn() {
    await setupTestData();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AnalysisService.getStatistics - should calculate max, min, average",
  async fn() {
    const analysisService = new AnalysisService(db);

    const result = await analysisService.getStatistics(testUserId, {
      dataTypeId: testDataTypeId,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-05"),
    });

    assertEquals(result.dataTypeId, testDataTypeId);
    assertEquals(result.max, "130.00"); // Maximum value
    assertEquals(result.min, "118.00"); // Minimum value
    assertEquals(result.avg, "123.00"); // Average: (120+125+118+130+122)/5 = 123
    assertEquals(result.count, 5);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AnalysisService.getStatistics - should return zero values when no data",
  async fn() {
    const analysisService = new AnalysisService(db);

    const result = await analysisService.getStatistics(testUserId, {
      dataTypeId: testDataTypeId,
      startDate: new Date("2023-01-01"),
      endDate: new Date("2023-12-31"),
    });

    assertEquals(result.count, 0);
    assertEquals(result.max, null);
    assertEquals(result.min, null);
    assertEquals(result.avg, null);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AnalysisService.getGraphData - should return time series data",
  async fn() {
    const analysisService = new AnalysisService(db);

    const result = await analysisService.getGraphData(testUserId, {
      dataTypeId: testDataTypeId,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-05"),
    });

    assertEquals(result.dataTypeId, testDataTypeId);
    assertEquals(result.data.length, 5);

    // Verify data points
    assertEquals(result.data[0].date, "2024-01-01");
    assertEquals(result.data[0].value, "120.00");
    assertEquals(result.data[4].date, "2024-01-05");
    assertEquals(result.data[4].value, "122.00");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AnalysisService.getGraphData - should return empty array when no data",
  async fn() {
    const analysisService = new AnalysisService(db);

    const result = await analysisService.getGraphData(testUserId, {
      dataTypeId: testDataTypeId,
      startDate: new Date("2023-01-01"),
      endDate: new Date("2023-12-31"),
    });

    assertEquals(result.data.length, 0);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AnalysisService.getMovingAverage - should calculate 30-day moving average",
  async fn() {
    const analysisService = new AnalysisService(db);

    // Create 30 days of data
    const healthDataService = new HealthDataService(db);
    for (let i = 6; i <= 35; i++) {
      const date = new Date(`2024-01-${i.toString().padStart(2, "0")}`);
      await healthDataService.createHealthData(testUserId, {
        dataTypeId: testDataTypeId,
        measurementValue: 120 + (i % 10), // Varying values
        measurementDate: date,
      });
    }

    const result = await analysisService.getMovingAverage(testUserId, {
      dataTypeId: testDataTypeId,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-02-04"),
      window: 30,
    });

    assertEquals(result.dataTypeId, testDataTypeId);
    assertEquals(result.data.length >= 5, true); // Should have data points with moving average

    // Verify first point with sufficient data has moving average
    const pointsWithMA = result.data.filter((d) => d.movingAverage !== null);
    assertEquals(pointsWithMA.length >= 1, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AnalysisService.getMovingAverage - should handle custom window size",
  async fn() {
    const analysisService = new AnalysisService(db);

    const result = await analysisService.getMovingAverage(testUserId, {
      dataTypeId: testDataTypeId,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-05"),
      window: 3,
    });

    assertEquals(result.dataTypeId, testDataTypeId);

    // With window=3, should have moving average from 3rd point onwards
    const pointsWithMA = result.data.filter((d) => d.movingAverage !== null);
    assertEquals(pointsWithMA.length >= 3, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AnalysisService.compareDataTypes - should return data for multiple data types",
  async fn() {
    const analysisService = new AnalysisService(db);

    // Create second data type
    const dataTypeService = new DataTypeService(db);
    const dataType2 = await dataTypeService.createDataType({
      dataTypeName: "test_脈拍分析",
      unit: "bpm",
      displayOrder: 2,
    });

    // Create data for second type
    const healthDataService = new HealthDataService(db);
    await healthDataService.createHealthData(testUserId, {
      dataTypeId: dataType2.dataTypeId,
      measurementValue: 75,
      measurementDate: new Date("2024-01-01"),
    });

    const result = await analysisService.compareDataTypes(testUserId, {
      dataTypeIds: [testDataTypeId, dataType2.dataTypeId],
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-05"),
    });

    assertEquals(result.length, 2);
    assertEquals(result[0].dataTypeId, testDataTypeId);
    assertEquals(result[1].dataTypeId, dataType2.dataTypeId);

    // Cleanup
    await sql`DELETE FROM data_type_master WHERE data_type_name = 'test_脈拍分析'`;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AnalysisService.compareDataTypes - should handle empty data for some types",
  async fn() {
    const analysisService = new AnalysisService(db);

    // Create data type with no data
    const dataTypeService = new DataTypeService(db);
    const dataType3 = await dataTypeService.createDataType({
      dataTypeName: "test_体重分析",
      unit: "kg",
      displayOrder: 3,
    });

    const result = await analysisService.compareDataTypes(testUserId, {
      dataTypeIds: [testDataTypeId, dataType3.dataTypeId],
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-05"),
    });

    assertEquals(result.length, 2);
    assertEquals(result[0].data.length >= 1, true); // Has data
    assertEquals(result[1].data.length, 0); // No data

    // Cleanup
    await sql`DELETE FROM data_type_master WHERE data_type_name = 'test_体重分析'`;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// Cleanup
Deno.test({
  name: "Cleanup: Close database connection",
  async fn() {
    await cleanupTestData();
    await closeConnection();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
