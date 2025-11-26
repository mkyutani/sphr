/**
 * Data Type API Integration Tests
 * Tests for data type management endpoints
 */

import { assertEquals, assertExists } from "std/assert/mod.ts";
import { closeConnection, sql } from "@backend/models/db.ts";
import { AuthService } from "@backend/services/AuthService.ts";
import { db } from "@backend/models/db.ts";

const API_BASE_URL = "http://localhost:8000";

// Test user credentials
let testUserId: bigint;
let authHeader: string;

// Test setup: Create test user and auth header
async function setupTestUser() {
  await sql`DELETE FROM users WHERE username = 'datatype_test'`;
  await sql`DELETE FROM data_type_master WHERE data_type_name LIKE 'apitest_%'`;

  const authService = new AuthService(db);
  const user = await authService.register("datatype_test", "TestPassword123!");
  testUserId = user.userId;

  // Create Basic Auth header
  const credentials = btoa("datatype_test:TestPassword123!");
  authHeader = `Basic ${credentials}`;
}

Deno.test({
  name: "Setup: Create test user",
  async fn() {
    await setupTestUser();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "POST /api/data-types - should create a new data type",
  async fn() {
    const response = await fetch(`${API_BASE_URL}/api/data-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeName: "apitest_血圧上",
        unit: "mmHg",
        displayOrder: 1,
      }),
    });

    const data = await response.json();

    assertEquals(response.status, 201);
    assertEquals(data.success, true);
    assertEquals(data.data.dataTypeName, "apitest_血圧上");
    assertEquals(data.data.unit, "mmHg");
    assertEquals(data.data.displayOrder, 1);
    assertEquals(data.data.isActive, true);
    assertExists(data.data.dataTypeId);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "POST /api/data-types - should reject duplicate data type name",
  async fn() {
    // Create first data type
    await fetch(`${API_BASE_URL}/api/data-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeName: "apitest_体重",
        unit: "kg",
        displayOrder: 1,
      }),
    });

    // Try to create duplicate
    const response = await fetch(`${API_BASE_URL}/api/data-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeName: "apitest_体重",
        unit: "kg",
        displayOrder: 2,
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
  name: "POST /api/data-types - should reject invalid input",
  async fn() {
    const response = await fetch(`${API_BASE_URL}/api/data-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeName: "",
        unit: "mmHg",
        displayOrder: 1,
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
  name: "POST /api/data-types - should require authentication",
  async fn() {
    const response = await fetch(`${API_BASE_URL}/api/data-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataTypeName: "apitest_no_auth",
        unit: "unit",
        displayOrder: 1,
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
  name: "GET /api/data-types - should return active data types",
  async fn() {
    const response = await fetch(`${API_BASE_URL}/api/data-types`, {
      headers: {
        "Authorization": authHeader,
      },
    });

    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(Array.isArray(data.data), true);

    // Should have at least the test data we created
    const testTypes = data.data.filter((dt: { dataTypeName: string }) =>
      dt.dataTypeName.startsWith("apitest_")
    );
    assertEquals(testTypes.length >= 1, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "GET /api/data-types/:id - should return data type by ID",
  async fn() {
    // Create a data type first
    const createResponse = await fetch(`${API_BASE_URL}/api/data-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeName: "apitest_findById",
        unit: "unit",
        displayOrder: 1,
      }),
    });

    const createData = await createResponse.json();
    const dataTypeId = createData.data.dataTypeId;

    // Get by ID
    const response = await fetch(`${API_BASE_URL}/api/data-types/${dataTypeId}`, {
      headers: {
        "Authorization": authHeader,
      },
    });

    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(data.data.dataTypeId, dataTypeId);
    assertEquals(data.data.dataTypeName, "apitest_findById");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "PUT /api/data-types/:id - should update data type",
  async fn() {
    // Create a data type first
    const createResponse = await fetch(`${API_BASE_URL}/api/data-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeName: "apitest_update",
        unit: "oldUnit",
        displayOrder: 1,
      }),
    });

    const createData = await createResponse.json();
    const dataTypeId = createData.data.dataTypeId;

    // Update
    const response = await fetch(`${API_BASE_URL}/api/data-types/${dataTypeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeName: "apitest_updated",
        unit: "newUnit",
        displayOrder: 2,
      }),
    });

    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(data.data.dataTypeName, "apitest_updated");
    assertEquals(data.data.unit, "newUnit");
    assertEquals(data.data.displayOrder, 2);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "PATCH /api/data-types/:id/deactivate - should deactivate data type",
  async fn() {
    // Create a data type first
    const createResponse = await fetch(`${API_BASE_URL}/api/data-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        dataTypeName: "apitest_deactivate",
        unit: "unit",
        displayOrder: 1,
      }),
    });

    const createData = await createResponse.json();
    const dataTypeId = createData.data.dataTypeId;

    // Deactivate
    const response = await fetch(`${API_BASE_URL}/api/data-types/${dataTypeId}/deactivate`, {
      method: "PATCH",
      headers: {
        "Authorization": authHeader,
      },
    });

    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);

    // Verify it's deactivated
    const getResponse = await fetch(`${API_BASE_URL}/api/data-types/${dataTypeId}`, {
      headers: {
        "Authorization": authHeader,
      },
    });

    const getData = await getResponse.json();
    assertEquals(getData.data.isActive, false);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "GET /api/data-types/all - should return all data types including inactive",
  async fn() {
    const response = await fetch(`${API_BASE_URL}/api/data-types/all`, {
      headers: {
        "Authorization": authHeader,
      },
    });

    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(Array.isArray(data.data), true);

    // Should include both active and inactive test data
    const testTypes = data.data.filter((dt: { dataTypeName: string }) =>
      dt.dataTypeName.startsWith("apitest_")
    );
    const inactiveTypes = testTypes.filter((dt: { isActive: boolean }) => !dt.isActive);

    assertEquals(inactiveTypes.length >= 1, true); // Should have at least the deactivated one
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// Cleanup
Deno.test({
  name: "Cleanup: Close database connection",
  async fn() {
    await sql`DELETE FROM users WHERE username = 'datatype_test'`;
    await sql`DELETE FROM data_type_master WHERE data_type_name LIKE 'apitest_%'`;
    await closeConnection();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
