/**
 * Validation Utilities
 * Provides validation helpers for input data
 */

import { ValidationError } from "@shared/types/errors.ts";

/**
 * Validation rule interface
 */
export interface ValidationRule {
  field: string;
  value: unknown;
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: unknown) => boolean;
  };
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

/**
 * Validate multiple fields
 */
export function validate(rules: ValidationRule[]): ValidationResult {
  const errors: Record<string, string[]> = {};

  for (const rule of rules) {
    const fieldErrors: string[] = [];

    // Required check
    if (rule.rules.required && (rule.value === undefined || rule.value === null || rule.value === "")) {
      fieldErrors.push(`${rule.field}は必須項目です`);
    }

    // Skip other validations if value is empty and not required
    if (!rule.rules.required && (rule.value === undefined || rule.value === null || rule.value === "")) {
      continue;
    }

    // String validations
    if (typeof rule.value === "string") {
      if (rule.rules.minLength && rule.value.length < rule.rules.minLength) {
        fieldErrors.push(`${rule.field}は${rule.rules.minLength}文字以上である必要があります`);
      }
      if (rule.rules.maxLength && rule.value.length > rule.rules.maxLength) {
        fieldErrors.push(`${rule.field}は${rule.rules.maxLength}文字以下である必要があります`);
      }
      if (rule.rules.pattern && !rule.rules.pattern.test(rule.value)) {
        fieldErrors.push(`${rule.field}の形式が正しくありません`);
      }
    }

    // Number validations
    if (typeof rule.value === "number") {
      if (rule.rules.min !== undefined && rule.value < rule.rules.min) {
        fieldErrors.push(`${rule.field}は${rule.rules.min}以上である必要があります`);
      }
      if (rule.rules.max !== undefined && rule.value > rule.rules.max) {
        fieldErrors.push(`${rule.field}は${rule.rules.max}以下である必要があります`);
      }
    }

    // Custom validation
    if (rule.rules.custom && !rule.rules.custom(rule.value)) {
      fieldErrors.push(`${rule.field}が検証に失敗しました`);
    }

    if (fieldErrors.length > 0) {
      errors[rule.field] = fieldErrors;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate and throw error if invalid
 */
export function validateOrThrow(rules: ValidationRule[]): void {
  const result = validate(rules);
  if (!result.valid) {
    throw new ValidationError("バリデーションエラーが発生しました", result.errors);
  }
}

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  username: /^[a-zA-Z0-9_]{3,50}$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  positiveNumber: /^\d+(\.\d+)?$/,
};

/**
 * Validate date string
 */
export function isValidDate(dateString: string): boolean {
  if (!ValidationPatterns.date.test(dateString)) {
    return false;
  }
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate date range
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return false;
  }
  return new Date(startDate) <= new Date(endDate);
}
