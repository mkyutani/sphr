/**
 * Health Check Endpoint Integration Tests
 *
 * Tests the /health endpoint to ensure:
 * - Returns 200 OK status
 * - Returns correct JSON structure
 * - Includes required fields (status, timestamp)
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

const API_BASE_URL = Deno.env.get("API_BASE_URL") || "http://localhost:8000";

Deno.test({
  name: "Health Check: GET /health should return 200 OK",
  async fn() {
    const response = await fetch(`${API_BASE_URL}/health`);

    assertEquals(response.status, 200, "Health check should return 200 OK");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Health Check: GET /health should return JSON with status and timestamp",
  async fn() {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();

    assertExists(data.status, "Response should include 'status' field");
    assertEquals(data.status, "ok", "Status should be 'ok'");

    assertExists(data.timestamp, "Response should include 'timestamp' field");

    // Verify timestamp is a valid ISO 8601 date string
    const timestamp = new Date(data.timestamp);
    assertEquals(
      isNaN(timestamp.getTime()),
      false,
      "Timestamp should be a valid date",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Health Check: GET /health should respond quickly (< 1 second)",
  async fn() {
    const startTime = Date.now();
    const response = await fetch(`${API_BASE_URL}/health`);
    const endTime = Date.now();
    const duration = endTime - startTime;

    assertEquals(response.status, 200, "Health check should return 200 OK");
    assertEquals(
      duration < 1000,
      true,
      `Health check should respond in less than 1 second (took ${duration}ms)`,
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Health Check: GET /health should have correct Content-Type header",
  async fn() {
    const response = await fetch(`${API_BASE_URL}/health`);
    const contentType = response.headers.get("content-type");

    assertExists(contentType, "Response should have Content-Type header");
    assertEquals(
      contentType?.includes("application/json"),
      true,
      "Content-Type should be application/json",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
