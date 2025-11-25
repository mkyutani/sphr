/**
 * Authentication Service Tests
 * Tests for user registration and password hashing
 */

import { assertEquals, assertRejects } from "std/assert/mod.ts";
import { AuthService } from "@backend/services/AuthService.ts";
import { ConflictError, ValidationError } from "@shared/types/errors.ts";
import { closeConnection, db, sql } from "@backend/models/db.ts";

// Test setup: Clean up test data before each test
async function cleanupTestData() {
  await sql`DELETE FROM users WHERE username LIKE 'test_%'`;
}

Deno.test({
  name: "AuthService.register - should successfully register a new user",
  async fn() {
    await cleanupTestData();

    const authService = new AuthService(db);
    const result = await authService.register("test_user1", "SecurePassword123!");

    assertEquals(result.username, "test_user1");
    assertEquals(typeof result.userId, "bigint");

    // Verify password is hashed, not stored in plain text
    const users = await sql`SELECT password_hash FROM users WHERE username = 'test_user1'`;
    assertEquals(users[0].password_hash.startsWith("$2"), true); // bcrypt hash starts with $2
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AuthService.register - should reject weak passwords",
  async fn() {
    await cleanupTestData();

    const authService = new AuthService(db);

    // Too short
    await assertRejects(
      async () => await authService.register("test_user2", "short"),
      ValidationError,
      "パスワードは8文字以上である必要があります",
    );

    // No uppercase
    await assertRejects(
      async () => await authService.register("test_user2", "lowercase123!"),
      ValidationError,
      "パスワードには大文字、小文字、数字、記号を含める必要があります",
    );

    // No lowercase
    await assertRejects(
      async () => await authService.register("test_user2", "UPPERCASE123!"),
      ValidationError,
      "パスワードには大文字、小文字、数字、記号を含める必要があります",
    );

    // No number
    await assertRejects(
      async () => await authService.register("test_user2", "NoNumber!"),
      ValidationError,
      "パスワードには大文字、小文字、数字、記号を含める必要があります",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AuthService.register - should reject invalid usernames",
  async fn() {
    await cleanupTestData();

    const authService = new AuthService(db);

    // Too short
    await assertRejects(
      async () => await authService.register("ab", "SecurePassword123!"),
      ValidationError,
      "ユーザー名は3文字以上50文字以下である必要があります",
    );

    // Too long
    await assertRejects(
      async () =>
        await authService.register(
          "a".repeat(51),
          "SecurePassword123!",
        ),
      ValidationError,
      "ユーザー名は3文字以上50文字以下である必要があります",
    );

    // Invalid characters
    await assertRejects(
      async () => await authService.register("invalid-user!", "SecurePassword123!"),
      ValidationError,
      "ユーザー名は英数字とアンダースコアのみ使用できます",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AuthService.register - should prevent duplicate usernames",
  async fn() {
    await cleanupTestData();

    const authService = new AuthService(db);

    // Register first user
    await authService.register("test_user3", "SecurePassword123!");

    // Try to register with same username
    await assertRejects(
      async () => await authService.register("test_user3", "DifferentPassword123!"),
      ConflictError,
      "このユーザー名は既に使用されています",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AuthService.register - should use bcrypt with cost factor 12",
  async fn() {
    await cleanupTestData();

    const authService = new AuthService(db);
    await authService.register("test_user4", "SecurePassword123!");

    // Get the hashed password
    const users = await sql`SELECT password_hash FROM users WHERE username = 'test_user4'`;
    const hash = users[0].password_hash;

    // bcrypt hash format: $2b$rounds$salt+hash
    // Extract rounds (cost factor)
    const rounds = hash.split("$")[2];
    assertEquals(rounds, "12", "Bcrypt cost factor should be 12");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AuthService.verifyPassword - should verify correct password",
  async fn() {
    await cleanupTestData();

    const authService = new AuthService(db);
    const password = "SecurePassword123!";
    await authService.register("test_user5", password);

    const isValid = await authService.verifyPassword("test_user5", password);
    assertEquals(isValid, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AuthService.verifyPassword - should reject incorrect password",
  async fn() {
    await cleanupTestData();

    const authService = new AuthService(db);
    await authService.register("test_user6", "SecurePassword123!");

    const isValid = await authService.verifyPassword("test_user6", "WrongPassword123!");
    assertEquals(isValid, false);
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
