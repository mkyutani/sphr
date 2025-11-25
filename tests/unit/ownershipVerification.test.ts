/**
 * Ownership Verification Middleware Tests
 */

import { assertEquals } from "std/assert/mod.ts";
import { Hono } from "hono";
import { verifyOwnership } from "@backend/middlewares/ownershipVerification.ts";

Deno.test({
  name: "verifyOwnership - should allow access when user owns resource",
  async fn() {
    const app = new Hono();

    app.get("/data/:id", (c, next) => {
      // Simulate authenticated user
      c.set("user", { userId: BigInt(123), username: "testuser" });
      // Simulate resource owned by same user
      c.set("resourceUserId", BigInt(123));
      return next();
    }, verifyOwnership(), (c) => {
      return c.json({ message: "success" });
    });

    const req = new Request("http://localhost/data/1");
    const res = await app.fetch(req);
    const data = await res.json();

    assertEquals(res.status, 200);
    assertEquals(data.message, "success");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "verifyOwnership - should deny access when user does not own resource",
  async fn() {
    const app = new Hono();

    app.get("/data/:id", (c, next) => {
      // Simulate authenticated user with ID 123
      c.set("user", { userId: BigInt(123), username: "testuser" });
      // Simulate resource owned by different user (ID 456)
      c.set("resourceUserId", BigInt(456));
      return next();
    }, verifyOwnership(), (c) => {
      return c.json({ message: "success" });
    });

    const req = new Request("http://localhost/data/1");
    const res = await app.fetch(req);
    const data = await res.json();

    assertEquals(res.status, 403);
    assertEquals(data.success, false);
    assertEquals(data.error.code, "AUTHORIZATION_ERROR");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "verifyOwnership - should handle string userId conversion",
  async fn() {
    const app = new Hono();

    app.get("/data/:id", (c, next) => {
      // Simulate authenticated user
      c.set("user", { userId: BigInt(123), username: "testuser" });
      // Simulate resource userId as string
      c.set("resourceUserId", "123");
      return next();
    }, verifyOwnership(), (c) => {
      return c.json({ message: "success" });
    });

    const req = new Request("http://localhost/data/1");
    const res = await app.fetch(req);
    const data = await res.json();

    assertEquals(res.status, 200);
    assertEquals(data.message, "success");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
