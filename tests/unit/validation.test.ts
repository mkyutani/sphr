/**
 * Validation Utilities Tests
 */

import { assertEquals, assertThrows } from "std/assert/mod.ts";
import {
  isValidDate,
  isValidDateRange,
  validate,
  ValidationPatterns,
  validateOrThrow,
} from "@backend/utils/validation.ts";
import { ValidationError } from "@shared/types/errors.ts";

Deno.test("validate - required field validation", () => {
  const result = validate([
    {
      field: "username",
      value: "",
      rules: { required: true },
    },
  ]);

  assertEquals(result.valid, false);
  assertEquals(result.errors.username[0], "usernameは必須項目です");
});

Deno.test("validate - minLength validation", () => {
  const result = validate([
    {
      field: "username",
      value: "ab",
      rules: { minLength: 3 },
    },
  ]);

  assertEquals(result.valid, false);
  assertEquals(result.errors.username[0], "usernameは3文字以上である必要があります");
});

Deno.test("validate - maxLength validation", () => {
  const result = validate([
    {
      field: "username",
      value: "abcdefghijk",
      rules: { maxLength: 10 },
    },
  ]);

  assertEquals(result.valid, false);
  assertEquals(result.errors.username[0], "usernameは10文字以下である必要があります");
});

Deno.test("validate - pattern validation", () => {
  const result = validate([
    {
      field: "username",
      value: "invalid-user!",
      rules: { pattern: ValidationPatterns.username },
    },
  ]);

  assertEquals(result.valid, false);
  assertEquals(result.errors.username[0], "usernameの形式が正しくありません");
});

Deno.test("validate - min number validation", () => {
  const result = validate([
    {
      field: "age",
      value: 5,
      rules: { min: 10 },
    },
  ]);

  assertEquals(result.valid, false);
  assertEquals(result.errors.age[0], "ageは10以上である必要があります");
});

Deno.test("validate - max number validation", () => {
  const result = validate([
    {
      field: "age",
      value: 150,
      rules: { max: 120 },
    },
  ]);

  assertEquals(result.valid, false);
  assertEquals(result.errors.age[0], "ageは120以下である必要があります");
});

Deno.test("validate - valid data passes", () => {
  const result = validate([
    {
      field: "username",
      value: "valid_user123",
      rules: {
        required: true,
        minLength: 3,
        maxLength: 50,
        pattern: ValidationPatterns.username,
      },
    },
  ]);

  assertEquals(result.valid, true);
  assertEquals(Object.keys(result.errors).length, 0);
});

Deno.test("validateOrThrow - throws ValidationError on invalid data", () => {
  assertThrows(
    () => {
      validateOrThrow([
        {
          field: "username",
          value: "",
          rules: { required: true },
        },
      ]);
    },
    ValidationError,
    "バリデーションエラーが発生しました",
  );
});

Deno.test("isValidDate - validates correct date format", () => {
  assertEquals(isValidDate("2025-01-15"), true);
  assertEquals(isValidDate("2025-12-31"), true);
});

Deno.test("isValidDate - rejects invalid date format", () => {
  assertEquals(isValidDate("2025/01/15"), false);
  assertEquals(isValidDate("15-01-2025"), false);
  assertEquals(isValidDate("2025-13-01"), false);
  assertEquals(isValidDate("invalid"), false);
});

Deno.test("isValidDateRange - validates correct date range", () => {
  assertEquals(isValidDateRange("2025-01-01", "2025-01-31"), true);
  assertEquals(isValidDateRange("2025-01-01", "2025-01-01"), true);
});

Deno.test("isValidDateRange - rejects invalid date range", () => {
  assertEquals(isValidDateRange("2025-01-31", "2025-01-01"), false);
  assertEquals(isValidDateRange("invalid", "2025-01-01"), false);
});
