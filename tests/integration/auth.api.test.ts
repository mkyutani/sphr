/**
 * Authentication API Integration Tests
 * Tests for user registration and authentication endpoints
 */

import { assertEquals } from "std/assert/mod.ts";
import { closeConnection, sql } from "@backend/models/db.ts";

const API_BASE_URL = "http://localhost:8000";

// Test setup: Clean up test data before each test
async function cleanupTestData() {
  await sql`DELETE FROM users WHERE username LIKE 'apitest_%'`;
}

Deno.test({
  name: "POST /api/auth/register - should successfully register a new user",
  async fn() {
    await cleanupTestData();

    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "apitest_user1",
        password: "SecurePassword123!",
      }),
    });

    const data = await response.json();

    assertEquals(response.status, 201);
    assertEquals(data.success, true);
    assertEquals(data.data.username, "apitest_user1");
    assertEquals(typeof data.data.userId, "string");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "POST /api/auth/register - should reject duplicate username",
  async fn() {
    await cleanupTestData();

    // Register first user
    await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "apitest_user2",
        password: "SecurePassword123!",
      }),
    });

    // Try to register with same username
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "apitest_user2",
        password: "DifferentPassword123!",
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
  name: "POST /api/auth/register - should reject weak password",
  async fn() {
    await cleanupTestData();

    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "apitest_user3",
        password: "weak",
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
  name: "POST /api/auth/register - should reject invalid username",
  async fn() {
    await cleanupTestData();

    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "invalid-user!",
        password: "SecurePassword123!",
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
  name: "POST /api/auth/register - should reject missing fields",
  async fn() {
    await cleanupTestData();

    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "apitest_user4",
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

// Cleanup: Close database connection after all tests
Deno.test({
  name: "Cleanup: Close database connection",
  async fn() {
    await cleanupTestData();
    await closeConnection();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
