/**
 * Database Connection Tests
 * Test basic database connectivity and schema validation
 */

import { assertEquals } from "std/assert/mod.ts";
import { closeConnection, sql, testConnection } from "@backend/models/db.ts";

Deno.test({
  name: "Database connection should be successful",
  async fn() {
    const result = await testConnection();
    assertEquals(result, true, "Database connection should succeed");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Should execute simple SQL query",
  async fn() {
    const result = await sql`SELECT 1 + 1 AS result`;
    assertEquals(result[0].result, 2, "Query should return correct result");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Should verify users table exists",
  async fn() {
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'users'
    `;
    assertEquals(result.length, 1, "Users table should exist");
    assertEquals(result[0].table_name, "users", "Table name should be 'users'");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Should verify health_data table exists",
  async fn() {
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'health_data'
    `;
    assertEquals(result.length, 1, "health_data table should exist");
    assertEquals(result[0].table_name, "health_data", "Table name should be 'health_data'");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Should verify data_type_master table exists",
  async fn() {
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'data_type_master'
    `;
    assertEquals(result.length, 1, "data_type_master table should exist");
    assertEquals(result[0].table_name, "data_type_master", "Table name should be 'data_type_master'");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// Close connection after all tests
Deno.test({
  name: "Cleanup: Close database connection",
  async fn() {
    await closeConnection();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
