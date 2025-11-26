/**
 * Import API Integration Tests
 * Tests import endpoints with real HTTP requests
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { afterAll, beforeAll, describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";

const API_BASE = "http://localhost:8000";

// Test user credentials
const testUser = {
  username: "import_api_test_user",
  password: "ImportTest123!",
};

// Helper function to create auth header
function authHeader(): HeadersInit {
  return {
    Authorization: `Basic ${btoa(`${testUser.username}:${testUser.password}`)}`,
  };
}

/**
 * Setup: Register user
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

describe("Import API", () => {
  describe("POST /api/import", () => {
    it("should import valid CSV data", async () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
2024-01-01,血圧上,120,mmHg,朝測定
2024-01-02,血圧上,118,mmHg,朝測定
2024-01-03,血圧上,122,mmHg,朝測定`;

      const formData = new FormData();
      const blob = new Blob([csv], { type: "text/csv" });
      formData.append("file", blob, "test.csv");

      const res = await fetch(`${API_BASE}/api/import`, {
        method: "POST",
        headers: authHeader(),
        body: formData,
      });

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.success, true);
      assertEquals(data.data.successCount, 3);
      assertEquals(data.data.failureCount, 0);
    });

    it("should handle CSV with errors", async () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
invalid-date,血圧上,120,mmHg,朝測定
2024-01-10,血圧上,not-a-number,mmHg,朝測定`;

      const formData = new FormData();
      const blob = new Blob([csv], { type: "text/csv" });
      formData.append("file", blob, "test.csv");

      const res = await fetch(`${API_BASE}/api/import`, {
        method: "POST",
        headers: authHeader(),
        body: formData,
      });

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.data.failureCount, 2);
      assertEquals(data.data.errors.length, 2);
    });

    it("should return error report for invalid data", async () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
2024-01-05,血圧上,not-a-number,mmHg,朝測定`;

      const formData = new FormData();
      const blob = new Blob([csv], { type: "text/csv" });
      formData.append("file", blob, "test.csv");

      const res = await fetch(`${API_BASE}/api/import`, {
        method: "POST",
        headers: authHeader(),
        body: formData,
      });

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.data.errors.length > 0, true);

      // Check error structure
      const error = data.data.errors[0];
      assertEquals(typeof error.row, "number");
      assertEquals(typeof error.field, "string");
      assertEquals(typeof error.message, "string");
    });

    it("should handle unknown data types", async () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
2024-01-06,未知のデータ種類,100,unit,メモ`;

      const formData = new FormData();
      const blob = new Blob([csv], { type: "text/csv" });
      formData.append("file", blob, "test.csv");

      const res = await fetch(`${API_BASE}/api/import`, {
        method: "POST",
        headers: authHeader(),
        body: formData,
      });

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.data.failureCount, 1);
      assertEquals(data.data.errors[0].message.includes("データ種類"), true);
    });

    it("should detect duplicate entries", async () => {
      // First import
      const csv1 = `測定日,データ種類,測定値,単位,メモ
2024-01-07,血圧上,120,mmHg,朝測定`;

      const formData1 = new FormData();
      const blob1 = new Blob([csv1], { type: "text/csv" });
      formData1.append("file", blob1, "test.csv");

      await fetch(`${API_BASE}/api/import`, {
        method: "POST",
        headers: authHeader(),
        body: formData1,
      });

      // Try to import duplicate
      const csv2 = `測定日,データ種類,測定値,単位,メモ
2024-01-07,血圧上,118,mmHg,夜測定`;

      const formData2 = new FormData();
      const blob2 = new Blob([csv2], { type: "text/csv" });
      formData2.append("file", blob2, "test.csv");

      const res = await fetch(`${API_BASE}/api/import`, {
        method: "POST",
        headers: authHeader(),
        body: formData2,
      });

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.data.failureCount, 1);
      assertEquals(data.data.errors[0].message.includes("既に登録"), true);
    });

    it("should return 400 if no file is uploaded", async () => {
      const formData = new FormData();

      const res = await fetch(`${API_BASE}/api/import`, {
        method: "POST",
        headers: authHeader(),
        body: formData,
      });

      assertEquals(res.status, 400);

      const data = await res.json();
      assertEquals(data.success, false);
      assertEquals(data.error.code, "VALIDATION_ERROR");
    });

    it("should return 400 if file is empty", async () => {
      const csv = "";

      const formData = new FormData();
      const blob = new Blob([csv], { type: "text/csv" });
      formData.append("file", blob, "test.csv");

      const res = await fetch(`${API_BASE}/api/import`, {
        method: "POST",
        headers: authHeader(),
        body: formData,
      });

      assertEquals(res.status, 400);

      const data = await res.json();
      assertEquals(data.success, false);
    });

    it("should handle CSV with memo field", async () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
2024-01-08,血圧上,120,mmHg,"朝測定, 空腹時"`;

      const formData = new FormData();
      const blob = new Blob([csv], { type: "text/csv" });
      formData.append("file", blob, "test.csv");

      const res = await fetch(`${API_BASE}/api/import`, {
        method: "POST",
        headers: authHeader(),
        body: formData,
      });

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.success, true);
      assertEquals(data.data.successCount, 1);
    });

    it("should handle CSV without memo column", async () => {
      const csv = `測定日,データ種類,測定値,単位
2024-01-09,血圧上,120,mmHg`;

      const formData = new FormData();
      const blob = new Blob([csv], { type: "text/csv" });
      formData.append("file", blob, "test.csv");

      const res = await fetch(`${API_BASE}/api/import`, {
        method: "POST",
        headers: authHeader(),
        body: formData,
      });

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.success, true);
      assertEquals(data.data.successCount, 1);
    });

    it("should provide success and failure counts", async () => {
      const csv = `測定日,データ種類,測定値,単位,メモ
2024-01-11,血圧上,120,mmHg,成功
invalid-date,血圧上,120,mmHg,失敗
2024-01-12,血圧上,122,mmHg,成功`;

      const formData = new FormData();
      const blob = new Blob([csv], { type: "text/csv" });
      formData.append("file", blob, "test.csv");

      const res = await fetch(`${API_BASE}/api/import`, {
        method: "POST",
        headers: authHeader(),
        body: formData,
      });

      assertEquals(res.status, 200);

      const data = await res.json();
      assertEquals(data.data.successCount, 2);
      assertEquals(data.data.failureCount, 1);
      assertEquals(data.data.successCount + data.data.failureCount, 3);
    });
  });
});
