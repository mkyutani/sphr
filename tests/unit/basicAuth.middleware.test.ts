/**
 * Basic Authentication Middleware Tests
 */

import { assertEquals } from "std/assert/mod.ts";
import { Hono } from "hono";
import { basicAuth } from "@backend/middlewares/basicAuth.ts";
import { closeConnection, sql } from "@backend/models/db.ts";
import { AuthService } from "@backend/services/AuthService.ts";
import { db } from "@backend/models/db.ts";

// Test setup: Create test user
async function setupTestUser() {
  await sql`DELETE FROM users WHERE username = 'basicauth_test'`;
  const authService = new AuthService(db);
  await authService.register("basicauth_test", "TestPassword123!");
}

Deno.test({
  name: "basicAuth middleware - should authenticate valid credentials",
  async fn() {
    await setupTestUser();

    const app = new Hono();
    app.use("/protected/*", basicAuth());
    app.get("/protected/resource", (c) => c.json({ message: "success" }));

    const credentials = btoa("basicauth_test:TestPassword123!");
    const req = new Request("http://localhost/protected/resource", {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    const res = await app.fetch(req);
    const data = await res.json();

    assertEquals(res.status, 200);
    assertEquals(data.message, "success");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "basicAuth middleware - should reject invalid password",
  async fn() {
    await setupTestUser();

    const app = new Hono();
    app.use("/protected/*", basicAuth());
    app.get("/protected/resource", (c) => c.json({ message: "success" }));

    const credentials = btoa("basicauth_test:WrongPassword123!");
    const req = new Request("http://localhost/protected/resource", {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    const res = await app.fetch(req);
    const data = await res.json();

    assertEquals(res.status, 401);
    assertEquals(data.success, false);
    assertEquals(data.error.code, "AUTHENTICATION_ERROR");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "basicAuth middleware - should reject missing Authorization header",
  async fn() {
    const app = new Hono();
    app.use("/protected/*", basicAuth());
    app.get("/protected/resource", (c) => c.json({ message: "success" }));

    const req = new Request("http://localhost/protected/resource");
    const res = await app.fetch(req);
    const data = await res.json();

    assertEquals(res.status, 401);
    assertEquals(data.success, false);
    assertEquals(data.error.code, "AUTHENTICATION_ERROR");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "basicAuth middleware - should reject malformed Authorization header",
  async fn() {
    const app = new Hono();
    app.use("/protected/*", basicAuth());
    app.get("/protected/resource", (c) => c.json({ message: "success" }));

    const req = new Request("http://localhost/protected/resource", {
      headers: {
        Authorization: "Bearer invalid-token",
      },
    });

    const res = await app.fetch(req);
    const data = await res.json();

    assertEquals(res.status, 401);
    assertEquals(data.success, false);
    assertEquals(data.error.code, "AUTHENTICATION_ERROR");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "basicAuth middleware - should reject non-existent user",
  async fn() {
    const app = new Hono();
    app.use("/protected/*", basicAuth());
    app.get("/protected/resource", (c) => c.json({ message: "success" }));

    const credentials = btoa("nonexistent_user:TestPassword123!");
    const req = new Request("http://localhost/protected/resource", {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    const res = await app.fetch(req);
    const data = await res.json();

    assertEquals(res.status, 401);
    assertEquals(data.success, false);
    assertEquals(data.error.code, "AUTHENTICATION_ERROR");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// Cleanup
Deno.test({
  name: "Cleanup: Close database connection",
  async fn() {
    await sql`DELETE FROM users WHERE username = 'basicauth_test'`;
    await closeConnection();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
