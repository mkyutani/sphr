/**
 * Result Type Unit Tests
 * Tests for the Result type utility
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ok, err, isOk, isErr, unwrap, unwrapOr, type Result } from "@shared/types/result.ts";

Deno.test("Result Type - ok creates success result", () => {
  const result = ok(42);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, 42);
  }
});

Deno.test("Result Type - err creates error result", () => {
  const error = { type: "NOT_FOUND", message: "Not found" };
  const result = err(error);

  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error, error);
  }
});

Deno.test("Result Type - isOk returns true for success result", () => {
  const result = ok(42);
  assertEquals(isOk(result), true);
});

Deno.test("Result Type - isOk returns false for error result", () => {
  const result = err({ type: "ERROR", message: "Error" });
  assertEquals(isOk(result), false);
});

Deno.test("Result Type - isErr returns true for error result", () => {
  const result = err({ type: "ERROR", message: "Error" });
  assertEquals(isErr(result), true);
});

Deno.test("Result Type - isErr returns false for success result", () => {
  const result = ok(42);
  assertEquals(isErr(result), false);
});

Deno.test("Result Type - unwrap returns data for success result", () => {
  const result = ok(42);
  assertEquals(unwrap(result), 42);
});

Deno.test("Result Type - unwrap throws for error result", () => {
  const result = err({ type: "ERROR", message: "Error occurred" });

  try {
    unwrap(result);
    throw new Error("Should have thrown");
  } catch (error) {
    if (error instanceof Error) {
      assertEquals(error.message, "Error occurred");
    }
  }
});

Deno.test("Result Type - unwrapOr returns data for success result", () => {
  const result = ok(42);
  assertEquals(unwrapOr(result, 0), 42);
});

Deno.test("Result Type - unwrapOr returns default for error result", () => {
  const result = err({ type: "ERROR", message: "Error" });
  assertEquals(unwrapOr(result, 0), 0);
});

Deno.test("Result Type - works with complex data types", () => {
  type User = { id: number; name: string };
  const user: User = { id: 1, name: "Alice" };
  const result = ok(user);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.id, 1);
    assertEquals(result.data.name, "Alice");
  }
});

Deno.test("Result Type - works with custom error types", () => {
  type ValidationError = {
    type: "VALIDATION_ERROR";
    message: string;
    field: string;
  };

  const error: ValidationError = {
    type: "VALIDATION_ERROR",
    message: "Invalid input",
    field: "email",
  };

  const result = err(error);

  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.type, "VALIDATION_ERROR");
    assertEquals(result.error.field, "email");
  }
});

Deno.test("Result Type - map transforms success value", () => {
  const result = ok(42);
  const mapped = result.success ? ok(result.data * 2) : result;

  assertEquals(mapped.success, true);
  if (mapped.success) {
    assertEquals(mapped.data, 84);
  }
});

Deno.test("Result Type - map preserves error", () => {
  const result: Result<number, { type: string; message: string }> = err({
    type: "ERROR",
    message: "Error",
  });

  // Error results are not transformed
  assertEquals(result.success, false);
});
