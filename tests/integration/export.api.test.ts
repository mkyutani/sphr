/**
 * Export API Integration Tests
 * Tests export endpoints with real HTTP requests
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { afterAll, beforeAll, describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";

const API_BASE = "http://localhost:8000";

// Test user credentials
const testUser = {
  username: "export_api_test_user",
  password: "ExportTest123!",
};

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

  for (let i = 0; i < 10; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    testData.push({
      dataTypeId,
      measurementValue: 70 + i,
      measurementDate: date.toISOString(),
      memo: `Test data ${i}`,
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

describe("Export API", () => {
  describe("POST /api/export (CSV)", () => {
    it("should export data as CSV", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 10);

      const res = await fetch(`${API_BASE}/api/export`, {
        method: "POST",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: "csv",
          startDate: startDate.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        }),
      });

      assertEquals(res.status, 200);
      assertEquals(res.headers.get("Content-Type"), "text/csv; charset=utf-8");
      assertEquals(
        res.headers.get("Content-Disposition")?.startsWith("attachment"),
        true,
      );

      const csv = await res.text();
      assertEquals(csv.includes("測定日,データ種類,測定値,単位,メモ"), true);
    });

    it("should filter by data type", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 10);

      const res = await fetch(`${API_BASE}/api/export`, {
        method: "POST",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: "csv",
          startDate: startDate.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
          dataTypeId,
        }),
      });

      assertEquals(res.status, 200);

      const csv = await res.text();
      const lines = csv.split("\n").filter((line) => line.trim() !== "");
      assertEquals(lines.length >= 2, true); // Header + data
    });

    it("should return 400 if format is missing", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 10);

      const res = await fetch(`${API_BASE}/api/export`, {
        method: "POST",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: startDate.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        }),
      });

      assertEquals(res.status, 400);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.error.code, "VALIDATION_ERROR");
    });

    it("should return 400 if dates are missing", async () => {
      const res = await fetch(`${API_BASE}/api/export`, {
        method: "POST",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: "csv",
        }),
      });

      assertEquals(res.status, 400);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.error.code, "VALIDATION_ERROR");
    });

    it("should return 400 if format is invalid", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 10);

      const res = await fetch(`${API_BASE}/api/export`, {
        method: "POST",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: "invalid",
          startDate: startDate.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        }),
      });

      assertEquals(res.status, 400);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.error.code, "VALIDATION_ERROR");
    });

    it("should return 400 if start date is after end date", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() + 10);

      const res = await fetch(`${API_BASE}/api/export`, {
        method: "POST",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: "csv",
          startDate: startDate.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        }),
      });

      assertEquals(res.status, 400);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.error.code, "VALIDATION_ERROR");
    });
  });

  describe("POST /api/export (PDF)", () => {
    it("should export data as PDF", async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 10);

      const res = await fetch(`${API_BASE}/api/export`, {
        method: "POST",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: "pdf",
          startDate: startDate.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        }),
      });

      assertEquals(res.status, 200);
      assertEquals(res.headers.get("Content-Type"), "application/pdf");
      assertEquals(
        res.headers.get("Content-Disposition")?.startsWith("attachment"),
        true,
      );

      const pdf = await res.arrayBuffer();
      assertEquals(pdf.byteLength > 0, true);
    });
  });

  describe("GET /api/export/history", () => {
    it("should get export history", async () => {
      // First, create an export
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 10);

      await fetch(`${API_BASE}/api/export`, {
        method: "POST",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: "csv",
          startDate: startDate.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        }),
      });

      // Get history
      const res = await fetch(`${API_BASE}/api/export/history`, {
        method: "GET",
        headers: authHeader(),
      });

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.success, true);
      assertEquals(Array.isArray(data.data), true);
      assertEquals(data.data.length > 0, true);

      // Check history item structure
      const firstItem = data.data[0];
      assertEquals(typeof firstItem.exportLogId, "string");
      assertEquals(typeof firstItem.format, "string");
      assertEquals(typeof firstItem.startDate, "string");
      assertEquals(typeof firstItem.endDate, "string");
      assertEquals(typeof firstItem.exportedAt, "string");
    });

    it("should support pagination", async () => {
      const res = await fetch(`${API_BASE}/api/export/history?limit=5&offset=0`, {
        method: "GET",
        headers: authHeader(),
      });

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.success, true);
      assertEquals(Array.isArray(data.data), true);
    });
  });
});
