/**
 * End-to-End Tests for SPHR Application
 * Tests complete user workflows using Playwright
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { afterAll, beforeAll, describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";

const APP_URL = "http://localhost:8000";

// Test user credentials
const testUser = {
  username: `e2e_test_user_${Date.now()}`,
  password: "E2ETest123!",
};

/**
 * Setup: Wait for app to be ready
 */
beforeAll(async () => {
  // Wait for app to be ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${APP_URL}/health`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {
      // App not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!ready) {
    throw new Error("App failed to start within 30 seconds");
  }
});

/**
 * Cleanup: Delete test user data
 */
afterAll(async () => {
  // Clean up test data via API
  try {
    const credentials = btoa(`${testUser.username}:${testUser.password}`);
    const headers = {
      Authorization: `Basic ${credentials}`,
    };

    // Get all health data
    const healthDataRes = await fetch(`${APP_URL}/api/health-data?limit=100`, {
      headers,
    });

    if (healthDataRes.ok) {
      const data = await healthDataRes.json();
      // Delete all health data
      for (const item of data.data.items) {
        await fetch(`${APP_URL}/api/health-data/${item.healthDataId}`, {
          method: "DELETE",
          headers,
        });
      }
    }
  } catch (err) {
    console.error("Cleanup failed:", err);
  }
});

describe("E2E: User Registration and Login Flow", () => {
  it("should register a new user", async () => {
    const res = await fetch(`${APP_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });

    assertEquals(res.status, 201);

    const data = await res.json();
    assertEquals(data.success, true);
    assertExists(data.data.userId);
  });

  it("should login with registered credentials", async () => {
    const res = await fetch(`${APP_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });

    assertEquals(res.status, 200);

    const data = await res.json();
    assertEquals(data.success, true);
    assertEquals(data.data.username, testUser.username);
  });

  it("should reject invalid credentials", async () => {
    const res = await fetch(`${APP_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: testUser.username,
        password: "wrong_password",
      }),
    });

    assertEquals(res.status, 401);
  });
});

describe("E2E: Health Data Management Flow", () => {
  const authHeader = () => ({
    Authorization: `Basic ${btoa(`${testUser.username}:${testUser.password}`)}`,
  });

  let createdDataId: string;
  let dataTypeId: string;

  it("should get available data types", async () => {
    const res = await fetch(`${APP_URL}/api/data-types`, {
      headers: authHeader(),
    });

    assertEquals(res.status, 200);

    const data = await res.json();
    assertEquals(data.success, true);
    assertEquals(Array.isArray(data.data), true);
    assertEquals(data.data.length > 0, true);

    // Use first data type for subsequent tests
    dataTypeId = data.data[0].dataTypeId;
  });

  it("should create health data", async () => {
    const res = await fetch(`${APP_URL}/api/health-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
      body: JSON.stringify({
        dataTypeId,
        measurementValue: 120.5,
        measurementDate: "2024-01-15",
        memo: "E2E test data",
      }),
    });

    assertEquals(res.status, 201);

    const data = await res.json();
    assertEquals(data.success, true);
    assertExists(data.data.healthDataId);

    createdDataId = data.data.healthDataId;
  });

  it("should retrieve health data", async () => {
    const res = await fetch(`${APP_URL}/api/health-data`, {
      headers: authHeader(),
    });

    assertEquals(res.status, 200);

    const data = await res.json();
    assertEquals(data.success, true);
    assertEquals(Array.isArray(data.data.items), true);
    assertEquals(data.data.items.length > 0, true);

    // Verify our created data exists
    const found = data.data.items.find(
      (item: any) => item.healthDataId === createdDataId,
    );
    assertExists(found);
    assertEquals(found.memo, "E2E test data");
  });

  it("should update health data", async () => {
    const res = await fetch(`${APP_URL}/api/health-data/${createdDataId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
      body: JSON.stringify({
        dataTypeId,
        measurementValue: 125.0,
        measurementDate: "2024-01-15",
        memo: "Updated E2E test data",
      }),
    });

    assertEquals(res.status, 200);

    const data = await res.json();
    assertEquals(data.success, true);
    assertEquals(data.data.memo, "Updated E2E test data");
    assertEquals(Number(data.data.value), 125.0);
  });

  it("should delete health data", async () => {
    const res = await fetch(`${APP_URL}/api/health-data/${createdDataId}`, {
      method: "DELETE",
      headers: authHeader(),
    });

    assertEquals(res.status, 200);

    const data = await res.json();
    assertEquals(data.success, true);

    // Verify deletion
    const getRes = await fetch(`${APP_URL}/api/health-data`, {
      headers: authHeader(),
    });

    const getData = await getRes.json();
    const found = getData.data.items.find(
      (item: any) => item.healthDataId === createdDataId,
    );
    assertEquals(found, undefined);
  });
});

describe("E2E: Data Analysis Flow", () => {
  const authHeader = () => ({
    Authorization: `Basic ${btoa(`${testUser.username}:${testUser.password}`)}`,
  });

  let dataTypeId: string;

  beforeAll(async () => {
    // Get data type
    const typesRes = await fetch(`${APP_URL}/api/data-types`, {
      headers: authHeader(),
    });
    const typesData = await typesRes.json();
    dataTypeId = typesData.data[0].dataTypeId;

    // Create test data for analysis
    const testData = [
      { date: "2024-01-10", value: 120 },
      { date: "2024-01-11", value: 118 },
      { date: "2024-01-12", value: 122 },
      { date: "2024-01-13", value: 119 },
      { date: "2024-01-14", value: 121 },
    ];

    for (const item of testData) {
      await fetch(`${APP_URL}/api/health-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({
          dataTypeId,
          measurementValue: item.value,
          measurementDate: item.date,
          memo: "Analysis test data",
        }),
      });
    }
  });

  it("should get statistics", async () => {
    const res = await fetch(
      `${APP_URL}/api/analysis/statistics?dataTypeId=${dataTypeId}&startDate=2024-01-10&endDate=2024-01-14`,
      {
        headers: authHeader(),
      },
    );

    assertEquals(res.status, 200);

    const data = await res.json();
    assertEquals(data.success, true);
    assertExists(data.data.max);
    assertExists(data.data.min);
    assertExists(data.data.avg);
    assertExists(data.data.count);

    // Verify statistics
    assertEquals(Number(data.data.max), 122);
    assertEquals(Number(data.data.min), 118);
    assertEquals(Number(data.data.count), 5);
  });

  it("should get graph data", async () => {
    const res = await fetch(
      `${APP_URL}/api/analysis/graph-data?dataTypeId=${dataTypeId}&startDate=2024-01-10&endDate=2024-01-14`,
      {
        headers: authHeader(),
      },
    );

    assertEquals(res.status, 200);

    const data = await res.json();
    assertEquals(data.success, true);
    assertEquals(Array.isArray(data.data.data), true);
    assertEquals(data.data.data.length, 5);
  });

  it("should get moving average", async () => {
    const res = await fetch(
      `${APP_URL}/api/analysis/moving-average?dataTypeId=${dataTypeId}&startDate=2024-01-10&endDate=2024-01-14&window=3`,
      {
        headers: authHeader(),
      },
    );

    assertEquals(res.status, 200);

    const data = await res.json();
    assertEquals(data.success, true);
    assertEquals(Array.isArray(data.data.data), true);
  });
});

describe("E2E: Data Export Flow", () => {
  const authHeader = () => ({
    Authorization: `Basic ${btoa(`${testUser.username}:${testUser.password}`)}`,
  });

  it("should export data as CSV", async () => {
    const res = await fetch(
      `${APP_URL}/api/export?format=csv&startDate=2024-01-01&endDate=2024-12-31`,
      {
        headers: authHeader(),
      },
    );

    assertEquals(res.status, 200);
    assertEquals(res.headers.get("content-type"), "text/csv");

    const csv = await res.text();
    assertEquals(csv.includes("測定日,データ種類,測定値,単位,メモ"), true);
  });

  it("should export data as PDF", async () => {
    const res = await fetch(
      `${APP_URL}/api/export?format=pdf&startDate=2024-01-01&endDate=2024-12-31`,
      {
        headers: authHeader(),
      },
    );

    assertEquals(res.status, 200);
    assertEquals(res.headers.get("content-type"), "application/pdf");

    const pdf = await res.arrayBuffer();
    assertEquals(pdf.byteLength > 0, true);
  });

  it("should get export history", async () => {
    const res = await fetch(`${APP_URL}/api/export/history`, {
      headers: authHeader(),
    });

    assertEquals(res.status, 200);

    const data = await res.json();
    assertEquals(data.success, true);
    assertEquals(Array.isArray(data.data), true);
  });
});

describe("E2E: Data Import Flow", () => {
  const authHeader = () => ({
    Authorization: `Basic ${btoa(`${testUser.username}:${testUser.password}`)}`,
  });

  it("should import valid CSV data", async () => {
    const csv = `測定日,データ種類,測定値,単位,メモ
2024-02-01,血圧上,120,mmHg,E2Eインポートテスト
2024-02-02,血圧上,118,mmHg,E2Eインポートテスト
2024-02-03,血圧上,122,mmHg,E2Eインポートテスト`;

    const formData = new FormData();
    const blob = new Blob([csv], { type: "text/csv" });
    formData.append("file", blob, "test.csv");

    const res = await fetch(`${APP_URL}/api/import`, {
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

  it("should handle invalid CSV data with error report", async () => {
    const csv = `測定日,データ種類,測定値,単位,メモ
invalid-date,血圧上,120,mmHg,エラーテスト
2024-02-05,血圧上,not-a-number,mmHg,エラーテスト`;

    const formData = new FormData();
    const blob = new Blob([csv], { type: "text/csv" });
    formData.append("file", blob, "test.csv");

    const res = await fetch(`${APP_URL}/api/import`, {
      method: "POST",
      headers: authHeader(),
      body: formData,
    });

    assertEquals(res.status, 200);

    const data = await res.json();
    assertEquals(data.success, false);
    assertEquals(data.data.failureCount, 2);
    assertEquals(Array.isArray(data.data.errors), true);
    assertEquals(data.data.errors.length, 2);
  });
});

describe("E2E: Security and Rate Limiting", () => {
  it("should enforce authentication on protected endpoints", async () => {
    const res = await fetch(`${APP_URL}/api/health-data`);

    assertEquals(res.status, 401);
  });

  it("should enforce rate limiting on auth endpoints", async () => {
    const requests = [];

    // Send 15 requests (rate limit is 10 per minute for auth)
    for (let i = 0; i < 15; i++) {
      requests.push(
        fetch(`${APP_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "rate_limit_test",
            password: "test",
          }),
        }),
      );
    }

    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status);

    // At least one request should be rate limited (429)
    assertEquals(statuses.includes(429), true);
  });

  it("should include security headers in responses", async () => {
    const res = await fetch(`${APP_URL}/health`);

    assertEquals(res.headers.has("x-content-type-options"), true);
    assertEquals(res.headers.has("x-frame-options"), true);
    assertEquals(res.headers.has("x-xss-protection"), true);
    assertEquals(res.headers.has("content-security-policy"), true);
  });
});
