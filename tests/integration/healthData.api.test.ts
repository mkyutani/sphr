/**
 * Health Data API Integration Tests
 * Tests for health data endpoints
 */

import { assertEquals, assertExists } from "std/assert/mod.ts";
import { closeConnection, sql } from "@backend/models/db.ts";
import { AuthService } from "@backend/services/AuthService.ts";
import { DataTypeService } from "@backend/services/DataTypeService.ts";
import { db } from "@backend/models/db.ts";

const API_BASE_URL = "http://localhost:8000";

// Test user and data type
let testUserId: bigint;
let testDataTypeId: string;
let authHeader: string;

// Test setup
async function setupTestData() {
  await sql`DELETE FROM health_data WHERE user_id IN (SELECT user_id FROM users WHERE username = 'healthdata_api_test')`;
  await sql`DELETE FROM users WHERE username = 'healthdata_api_test'`;
  await sql`DELETE FROM data_type_master WHERE data_type_name = 'apitest_血圧'`;

  const authService = new AuthService(db);
  const user = await authService.register("healthdata_api_test", "TestPassword123!");
  testUserId = user.userId;

  const dataTypeService = new DataTypeService(db);
  const dataType = await dataTypeService.createDataType({
    dataTypeName: "apitest_血圧",
    unit: "mmHg",
    displayOrder: 1,
  });
  testDataTypeId = dataType.dataTypeId.toString();

  // Create Basic Auth header
  const credentials = btoa("healthdata_api_test:TestPassword123!");
  authHeader = `Basic ${credentials}`;
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
  name: "POST /api/health-data - should create health data",
  async fn() {
    const response = await fetch(`${API_BASE_URL}/api/health-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeId: testDataTypeId,
        measurementValue: 120,
        measurementDate: "2024-01-15",
        memo: "朝の測定",
      }),
    });

    const data = await response.json();

    assertEquals(response.status, 201);
    assertEquals(data.success, true);
    assertEquals(data.data.dataTypeId, testDataTypeId);
    assertEquals(data.data.measurementValue, "120.00");
    assertEquals(data.data.measurementDate, "2024-01-15");
    assertEquals(data.data.memo, "朝の測定");
    assertExists(data.data.healthDataId);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "POST /api/health-data - should require authentication",
  async fn() {
    const response = await fetch(`${API_BASE_URL}/api/health-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataTypeId: testDataTypeId,
        measurementValue: 120,
        measurementDate: "2024-01-15",
      }),
    });

    const data = await response.json();

    assertEquals(response.status, 401);
    assertEquals(data.success, false);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "POST /api/health-data - should reject missing required fields",
  async fn() {
    const response = await fetch(`${API_BASE_URL}/api/health-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeId: testDataTypeId,
        // Missing measurementValue and measurementDate
      }),
    });

    const data = await response.json();

    assertEquals(response.status, 400);
    assertEquals(data.success, false);
    assertEquals(data.error.code, "VALIDATION_ERROR");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "POST /api/health-data - should reject future dates",
  async fn() {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const response = await fetch(`${API_BASE_URL}/api/health-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeId: testDataTypeId,
        measurementValue: 120,
        measurementDate: futureDate.toISOString().split("T")[0],
      }),
    });

    const data = await response.json();

    assertEquals(response.status, 400);
    assertEquals(data.success, false);
    assertEquals(data.error.code, "VALIDATION_ERROR");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "POST /api/health-data - should reject duplicate entry",
  async fn() {
    // Create first entry
    await fetch(`${API_BASE_URL}/api/health-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeId: testDataTypeId,
        measurementValue: 120,
        measurementDate: "2024-01-16",
      }),
    });

    // Try to create duplicate
    const response = await fetch(`${API_BASE_URL}/api/health-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeId: testDataTypeId,
        measurementValue: 125,
        measurementDate: "2024-01-16",
      }),
    });

    const data = await response.json();

    assertEquals(response.status, 409);
    assertEquals(data.success, false);
    assertEquals(data.error.code, "CONFLICT_ERROR");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "GET /api/health-data - should return health data",
  async fn() {
    const response = await fetch(`${API_BASE_URL}/api/health-data`, {
      headers: {
        "Authorization": authHeader,
      },
    });

    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(Array.isArray(data.data.items), true);
    assertEquals(data.data.items.length >= 1, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "GET /api/health-data - should support date range filter",
  async fn() {
    const response = await fetch(
      `${API_BASE_URL}/api/health-data?startDate=2024-01-15&endDate=2024-01-16`,
      {
        headers: {
          "Authorization": authHeader,
        },
      },
    );

    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(Array.isArray(data.data.items), true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "GET /api/health-data - should support pagination",
  async fn() {
    const response = await fetch(`${API_BASE_URL}/api/health-data?limit=1&offset=0`, {
      headers: {
        "Authorization": authHeader,
      },
    });

    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(data.data.limit, 1);
    assertEquals(data.data.offset, 0);
    assertEquals(data.data.items.length <= 1, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "GET /api/health-data/:id - should return health data by ID",
  async fn() {
    // Create data first
    const createResponse = await fetch(`${API_BASE_URL}/api/health-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeId: testDataTypeId,
        measurementValue: 130,
        measurementDate: "2024-01-17",
      }),
    });

    const createData = await createResponse.json();
    const healthDataId = createData.data.healthDataId;

    // Get by ID
    const response = await fetch(`${API_BASE_URL}/api/health-data/${healthDataId}`, {
      headers: {
        "Authorization": authHeader,
      },
    });

    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(data.data.healthDataId, healthDataId);
    assertEquals(data.data.measurementValue, "130.00");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "PUT /api/health-data/:id - should update health data",
  async fn() {
    // Create data first
    const createResponse = await fetch(`${API_BASE_URL}/api/health-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeId: testDataTypeId,
        measurementValue: 120,
        measurementDate: "2024-01-18",
        memo: "元のメモ",
      }),
    });

    const createData = await createResponse.json();
    const healthDataId = createData.data.healthDataId;

    // Update
    const response = await fetch(`${API_BASE_URL}/api/health-data/${healthDataId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        measurementValue: 125,
        memo: "更新されたメモ",
      }),
    });

    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(data.data.measurementValue, "125.00");
    assertEquals(data.data.memo, "更新されたメモ");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "DELETE /api/health-data/:id - should delete health data",
  async fn() {
    // Create data first
    const createResponse = await fetch(`${API_BASE_URL}/api/health-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeId: testDataTypeId,
        measurementValue: 120,
        measurementDate: "2024-01-19",
      }),
    });

    const createData = await createResponse.json();
    const healthDataId = createData.data.healthDataId;

    // Delete
    const response = await fetch(`${API_BASE_URL}/api/health-data/${healthDataId}`, {
      method: "DELETE",
      headers: {
        "Authorization": authHeader,
      },
    });

    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);

    // Verify deleted
    const getResponse = await fetch(`${API_BASE_URL}/api/health-data/${healthDataId}`, {
      headers: {
        "Authorization": authHeader,
      },
    });

    assertEquals(getResponse.status, 404);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// Cleanup
Deno.test({
  name: "Cleanup: Close database connection",
  async fn() {
    await sql`DELETE FROM health_data WHERE user_id IN (SELECT user_id FROM users WHERE username = 'healthdata_api_test')`;
    await sql`DELETE FROM users WHERE username = 'healthdata_api_test'`;
    await sql`DELETE FROM data_type_master WHERE data_type_name = 'apitest_血圧'`;
    await closeConnection();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
