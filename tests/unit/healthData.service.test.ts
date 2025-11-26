/**
 * Health Data Service Tests
 * Tests for health data registration, update, and delete operations
 */

import { assertEquals, assertRejects } from "std/assert/mod.ts";
import { HealthDataService } from "@backend/services/HealthDataService.ts";
import { DataTypeService } from "@backend/services/DataTypeService.ts";
import { AuthService } from "@backend/services/AuthService.ts";
import { ConflictError, NotFoundError, ValidationError } from "@shared/types/errors.ts";
import { closeConnection, db, sql } from "@backend/models/db.ts";

// Test user and data type
let testUserId: bigint;
let testDataTypeId: bigint;

// Setup: Create test user and data type
async function setupTestData() {
  await sql`DELETE FROM health_data WHERE user_id IN (SELECT user_id FROM users WHERE username = 'healthdata_test')`;
  await sql`DELETE FROM users WHERE username = 'healthdata_test'`;
  await sql`DELETE FROM data_type_master WHERE data_type_name = 'test_血圧'`;

  const authService = new AuthService(db);
  const user = await authService.register("healthdata_test", "TestPassword123!");
  testUserId = user.userId;

  const dataTypeService = new DataTypeService(db);
  const dataType = await dataTypeService.createDataType({
    dataTypeName: "test_血圧",
    unit: "mmHg",
    displayOrder: 1,
  });
  testDataTypeId = dataType.dataTypeId;
}

// Cleanup
async function cleanupTestData() {
  await sql`DELETE FROM health_data WHERE user_id IN (SELECT user_id FROM users WHERE username = 'healthdata_test')`;
  await sql`DELETE FROM users WHERE username = 'healthdata_test'`;
  await sql`DELETE FROM data_type_master WHERE data_type_name = 'test_血圧'`;
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
  name: "HealthDataService.createHealthData - should create health data",
  async fn() {
    const healthDataService = new HealthDataService(db);

    const result = await healthDataService.createHealthData(testUserId, {
      dataTypeId: testDataTypeId,
      measurementValue: 120,
      measurementDate: new Date("2024-01-15"),
      memo: "朝の測定",
    });

    assertEquals(result.userId, testUserId);
    assertEquals(result.dataTypeId, testDataTypeId);
    assertEquals(result.measurementValue, "120.00");
    assertEquals(result.measurementDate, "2024-01-15");
    assertEquals(result.memo, "朝の測定");
    assertEquals(typeof result.healthDataId, "bigint");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "HealthDataService.createHealthData - should validate measurement value is numeric",
  async fn() {
    const healthDataService = new HealthDataService(db);

    await assertRejects(
      async () => await healthDataService.createHealthData(testUserId, {
        dataTypeId: testDataTypeId,
        measurementValue: NaN,
        measurementDate: new Date("2024-01-15"),
      }),
      ValidationError,
      "測定値は数値で入力してください",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "HealthDataService.createHealthData - should reject future dates",
  async fn() {
    const healthDataService = new HealthDataService(db);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    await assertRejects(
      async () => await healthDataService.createHealthData(testUserId, {
        dataTypeId: testDataTypeId,
        measurementValue: 120,
        measurementDate: futureDate,
      }),
      ValidationError,
      "未来の日付は指定できません",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "HealthDataService.createHealthData - should reject missing required fields",
  async fn() {
    const healthDataService = new HealthDataService(db);

    await assertRejects(
      async () => await healthDataService.createHealthData(testUserId, {
        dataTypeId: testDataTypeId,
        measurementValue: 0,
        measurementDate: new Date("2024-01-15"),
      }),
      ValidationError,
      "測定値は必須です",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "HealthDataService.createHealthData - should reject duplicate entry (same user, data type, date)",
  async fn() {
    const healthDataService = new HealthDataService(db);

    // Create first entry
    await healthDataService.createHealthData(testUserId, {
      dataTypeId: testDataTypeId,
      measurementValue: 120,
      measurementDate: new Date("2024-01-16"),
    });

    // Try to create duplicate
    await assertRejects(
      async () => await healthDataService.createHealthData(testUserId, {
        dataTypeId: testDataTypeId,
        measurementValue: 125,
        measurementDate: new Date("2024-01-16"),
      }),
      ConflictError,
      "この日付のデータは既に登録されています",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "HealthDataService.createHealthData - should reject non-existent data type",
  async fn() {
    const healthDataService = new HealthDataService(db);

    await assertRejects(
      async () => await healthDataService.createHealthData(testUserId, {
        dataTypeId: BigInt(999999),
        measurementValue: 120,
        measurementDate: new Date("2024-01-15"),
      }),
      NotFoundError,
      "データ種類が見つかりません",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "HealthDataService.createHealthData - should record audit log",
  async fn() {
    const healthDataService = new HealthDataService(db);

    const result = await healthDataService.createHealthData(testUserId, {
      dataTypeId: testDataTypeId,
      measurementValue: 130,
      measurementDate: new Date("2024-01-17"),
    });

    // Verify audit log exists
    const logs = await sql`
      SELECT * FROM access_log
      WHERE user_id = ${testUserId}
      AND operation = 'CREATE'
      AND target_type = 'health_data'
      AND target_id = ${result.healthDataId}
    `;

    assertEquals(logs.length, 1);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "HealthDataService.updateHealthData - should update health data",
  async fn() {
    const healthDataService = new HealthDataService(db);

    // Create data
    const created = await healthDataService.createHealthData(testUserId, {
      dataTypeId: testDataTypeId,
      measurementValue: 120,
      measurementDate: new Date("2024-01-18"),
      memo: "元のメモ",
    });

    // Update data
    const updated = await healthDataService.updateHealthData(
      testUserId,
      created.healthDataId,
      {
        measurementValue: 125,
        memo: "更新されたメモ",
      },
    );

    assertEquals(updated.healthDataId, created.healthDataId);
    assertEquals(updated.measurementValue, "125.00");
    assertEquals(updated.memo, "更新されたメモ");
    assertEquals(updated.measurementDate, created.measurementDate); // Unchanged
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "HealthDataService.updateHealthData - should reject unauthorized update",
  async fn() {
    const healthDataService = new HealthDataService(db);

    // Create data with testUserId
    const created = await healthDataService.createHealthData(testUserId, {
      dataTypeId: testDataTypeId,
      measurementValue: 120,
      measurementDate: new Date("2024-01-19"),
    });

    // Try to update with different user ID
    const differentUserId = testUserId + BigInt(1);

    await assertRejects(
      async () => await healthDataService.updateHealthData(
        differentUserId,
        created.healthDataId,
        {
          measurementValue: 125,
        },
      ),
      Error,
      "このデータへのアクセス権限がありません",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "HealthDataService.deleteHealthData - should delete health data",
  async fn() {
    const healthDataService = new HealthDataService(db);

    // Create data
    const created = await healthDataService.createHealthData(testUserId, {
      dataTypeId: testDataTypeId,
      measurementValue: 120,
      measurementDate: new Date("2024-01-20"),
    });

    // Delete data
    await healthDataService.deleteHealthData(testUserId, created.healthDataId);

    // Verify data is deleted
    await assertRejects(
      async () => await healthDataService.getHealthDataById(testUserId, created.healthDataId),
      NotFoundError,
      "健康データが見つかりません",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "HealthDataService.deleteHealthData - should reject unauthorized delete",
  async fn() {
    const healthDataService = new HealthDataService(db);

    // Create data
    const created = await healthDataService.createHealthData(testUserId, {
      dataTypeId: testDataTypeId,
      measurementValue: 120,
      measurementDate: new Date("2024-01-21"),
    });

    // Try to delete with different user ID
    const differentUserId = testUserId + BigInt(1);

    await assertRejects(
      async () => await healthDataService.deleteHealthData(differentUserId, created.healthDataId),
      Error,
      "このデータへのアクセス権限がありません",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "HealthDataService.deleteHealthData - should record audit log",
  async fn() {
    const healthDataService = new HealthDataService(db);

    // Create data
    const created = await healthDataService.createHealthData(testUserId, {
      dataTypeId: testDataTypeId,
      measurementValue: 120,
      measurementDate: new Date("2024-01-22"),
    });

    // Delete data
    await healthDataService.deleteHealthData(testUserId, created.healthDataId);

    // Verify audit log exists
    const logs = await sql`
      SELECT * FROM access_log
      WHERE user_id = ${testUserId}
      AND operation = 'DELETE'
      AND target_type = 'health_data'
      AND target_id = ${created.healthDataId}
    `;

    assertEquals(logs.length, 1);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "HealthDataService.getHealthData - should return health data with filters",
  async fn() {
    const healthDataService = new HealthDataService(db);

    // Create multiple data points
    await healthDataService.createHealthData(testUserId, {
      dataTypeId: testDataTypeId,
      measurementValue: 120,
      measurementDate: new Date("2024-01-23"),
    });

    await healthDataService.createHealthData(testUserId, {
      dataTypeId: testDataTypeId,
      measurementValue: 125,
      measurementDate: new Date("2024-01-24"),
    });

    // Get data with date range filter
    const result = await healthDataService.getHealthData(testUserId, {
      startDate: new Date("2024-01-23"),
      endDate: new Date("2024-01-24"),
    });

    assertEquals(result.data.length >= 2, true);
    assertEquals(result.total >= 2, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "HealthDataService.getHealthData - should support pagination",
  async fn() {
    const healthDataService = new HealthDataService(db);

    // Get data with pagination
    const result = await healthDataService.getHealthData(testUserId, {
      limit: 2,
      offset: 0,
    });

    assertEquals(result.limit, 2);
    assertEquals(result.offset, 0);
    assertEquals(result.data.length <= 2, true);
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
