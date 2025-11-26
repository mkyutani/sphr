/**
 * Analysis API Integration Tests
 * Tests analysis endpoints with real HTTP requests
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { afterAll, beforeAll, describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";

const API_BASE = "http://localhost:8000";

// Test user credentials
const testUser = {
  username: "analysis_test_user",
  password: "AnalysisTest123!",
};

// Auth token
let authToken = "";

// Test data type ID
let dataTypeId = "";

// Helper function to create auth header
function authHeader(): HeadersInit {
  return {
    Authorization: `Basic ${btoa(`${testUser.username}:${testUser.password}`)}`,
  };
}

/**
 * Setup: Register user and create test data
 */
beforeAll(async () => {
  // Register test user
  const registerRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testUser),
  });

  if (!registerRes.ok) {
    console.error("Failed to register test user:", await registerRes.text());
  }

  // Get data types
  const dataTypesRes = await fetch(`${API_BASE}/api/data-types`, {
    method: "GET",
    headers: authHeader(),
  });

  const dataTypesData = await dataTypesRes.json();
  dataTypeId = dataTypesData.data[0].dataTypeId;

  // Create test health data
  const today = new Date();
  const testData = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    testData.push({
      dataTypeId,
      measurementValue: 120 + Math.sin(i / 5) * 20, // Oscillating values
      measurementDate: date.toISOString(),
    });
  }

  // Insert test data
  for (const data of testData) {
    await fetch(`${API_BASE}/api/health-data`, {
      method: "POST",
      headers: {
        ...authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  }
});

/**
 * Cleanup: Delete test user data
 */
afterAll(async () => {
  // Get all health data
  const healthDataRes = await fetch(
    `${API_BASE}/api/health-data?limit=100`,
    {
      method: "GET",
      headers: authHeader(),
    },
  );

  if (healthDataRes.ok) {
    const healthDataData = await healthDataRes.json();

    // Delete all health data
    for (const item of healthDataData.data.items) {
      await fetch(`${API_BASE}/api/health-data/${item.healthDataId}`, {
        method: "DELETE",
        headers: authHeader(),
      });
    }
  }
});

describe("Analysis API", () => {
  describe("GET /api/analysis/statistics", () => {
    it("should get statistics for data type", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);

      const res = await fetch(
        `${API_BASE}/api/analysis/statistics?dataTypeId=${dataTypeId}&startDate=${
          startDate.toISOString().split("T")[0]
        }&endDate=${today.toISOString().split("T")[0]}`,
        {
          method: "GET",
          headers: authHeader(),
        },
      );

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.success, true);
      assertEquals(typeof data.data.max, "number");
      assertEquals(typeof data.data.min, "number");
      assertEquals(typeof data.data.avg, "number");
      assertEquals(typeof data.data.count, "number");
      assertEquals(data.data.count > 0, true);
    });

    it("should return 400 if dataTypeId is missing", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);

      const res = await fetch(
        `${API_BASE}/api/analysis/statistics?startDate=${
          startDate.toISOString().split("T")[0]
        }&endDate=${today.toISOString().split("T")[0]}`,
        {
          method: "GET",
          headers: authHeader(),
        },
      );

      assertEquals(res.status, 400);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.error.code, "VALIDATION_ERROR");
    });

    it("should return 400 if startDate is missing", async () => {
      const today = new Date();

      const res = await fetch(
        `${API_BASE}/api/analysis/statistics?dataTypeId=${dataTypeId}&endDate=${
          today.toISOString().split("T")[0]
        }`,
        {
          method: "GET",
          headers: authHeader(),
        },
      );

      assertEquals(res.status, 400);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.error.code, "VALIDATION_ERROR");
    });

    it("should return 400 if endDate is missing", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const res = await fetch(
        `${API_BASE}/api/analysis/statistics?dataTypeId=${dataTypeId}&startDate=${
          startDate.toISOString().split("T")[0]
        }`,
        {
          method: "GET",
          headers: authHeader(),
        },
      );

      assertEquals(res.status, 400);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.error.code, "VALIDATION_ERROR");
    });
  });

  describe("GET /api/analysis/graph", () => {
    it("should get graph data for data type", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);

      const res = await fetch(
        `${API_BASE}/api/analysis/graph?dataTypeId=${dataTypeId}&startDate=${
          startDate.toISOString().split("T")[0]
        }&endDate=${today.toISOString().split("T")[0]}`,
        {
          method: "GET",
          headers: authHeader(),
        },
      );

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.success, true);
      assertEquals(Array.isArray(data.data.data), true);
      assertEquals(data.data.data.length > 0, true);

      // Check data structure
      const firstPoint = data.data.data[0];
      assertEquals(typeof firstPoint.date, "string");
      assertEquals(typeof firstPoint.value, "number");
    });

    it("should return 400 if parameters are missing", async () => {
      const res = await fetch(`${API_BASE}/api/analysis/graph`, {
        method: "GET",
        headers: authHeader(),
      });

      assertEquals(res.status, 400);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.error.code, "VALIDATION_ERROR");
    });
  });

  describe("GET /api/analysis/moving-average", () => {
    it("should get moving average with default window", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);

      const res = await fetch(
        `${API_BASE}/api/analysis/moving-average?dataTypeId=${dataTypeId}&startDate=${
          startDate.toISOString().split("T")[0]
        }&endDate=${today.toISOString().split("T")[0]}`,
        {
          method: "GET",
          headers: authHeader(),
        },
      );

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.success, true);
      assertEquals(Array.isArray(data.data.data), true);
      assertEquals(data.data.window, 30); // Default window

      // Check data structure
      if (data.data.data.length > 0) {
        const firstPoint = data.data.data[0];
        assertEquals(typeof firstPoint.date, "string");
        assertEquals(typeof firstPoint.value, "number");
        assertEquals(typeof firstPoint.movingAverage, "number");
      }
    });

    it("should get moving average with custom window", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);

      const res = await fetch(
        `${API_BASE}/api/analysis/moving-average?dataTypeId=${dataTypeId}&startDate=${
          startDate.toISOString().split("T")[0]
        }&endDate=${today.toISOString().split("T")[0]}&window=7`,
        {
          method: "GET",
          headers: authHeader(),
        },
      );

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.success, true);
      assertEquals(data.data.window, 7);
    });

    it("should return 400 if parameters are missing", async () => {
      const res = await fetch(`${API_BASE}/api/analysis/moving-average`, {
        method: "GET",
        headers: authHeader(),
      });

      assertEquals(res.status, 400);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.error.code, "VALIDATION_ERROR");
    });
  });

  describe("GET /api/analysis/compare", () => {
    it("should compare multiple data types", async () => {
      // Get all data types
      const dataTypesRes = await fetch(`${API_BASE}/api/data-types`, {
        method: "GET",
        headers: authHeader(),
      });

      const dataTypesData = await dataTypesRes.json();
      const dataTypeIds = dataTypesData.data.slice(0, 2).map((dt: { dataTypeId: string }) => dt.dataTypeId);

      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);

      const queryParams = new URLSearchParams();
      dataTypeIds.forEach((id: string) => {
        queryParams.append("dataTypeIds[]", id);
      });
      queryParams.append("startDate", startDate.toISOString().split("T")[0]);
      queryParams.append("endDate", today.toISOString().split("T")[0]);

      const res = await fetch(
        `${API_BASE}/api/analysis/compare?${queryParams.toString()}`,
        {
          method: "GET",
          headers: authHeader(),
        },
      );

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.success, true);
      assertEquals(Array.isArray(data.data), true);

      // Check data structure
      if (data.data.length > 0) {
        const firstType = data.data[0];
        assertEquals(typeof firstType.dataTypeId, "string");
        assertEquals(typeof firstType.dataTypeName, "string");
        assertEquals(Array.isArray(firstType.data), true);
      }
    });

    it("should return 400 if dataTypeIds are missing", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);

      const res = await fetch(
        `${API_BASE}/api/analysis/compare?startDate=${
          startDate.toISOString().split("T")[0]
        }&endDate=${today.toISOString().split("T")[0]}`,
        {
          method: "GET",
          headers: authHeader(),
        },
      );

      assertEquals(res.status, 400);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.error.code, "VALIDATION_ERROR");
    });

    it("should return 400 if parameters are missing", async () => {
      const res = await fetch(`${API_BASE}/api/analysis/compare`, {
        method: "GET",
        headers: authHeader(),
      });

      assertEquals(res.status, 400);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.error.code, "VALIDATION_ERROR");
    });
  });
});
