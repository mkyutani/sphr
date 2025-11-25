/**
 * Result Type
 * Type-safe result handling for operations that can fail
 * Based on Rust's Result type and functional programming principles
 */

/**
 * Success result
 */
export type Ok<T> = {
  success: true;
  data: T;
};

/**
 * Error result
 */
export type Err<E> = {
  success: false;
  error: E;
};

/**
 * Result type - represents either success with data or failure with error
 */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Create a success result
 */
export function ok<T>(data: T): Ok<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function err<E>(error: E): Err<E> {
  return { success: false, error };
}

/**
 * Check if result is success
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.success === true;
}

/**
 * Check if result is error
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.success === false;
}

/**
 * Unwrap result - returns data or throws error
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.success) {
    return result.data;
  }

  // For errors with a message field, use it for the error message
  const errorMessage = typeof result.error === "object" &&
      result.error !== null &&
      "message" in result.error &&
      typeof (result.error as { message: unknown }).message === "string"
    ? (result.error as { message: string }).message
    : "Operation failed";

  throw new Error(errorMessage);
}

/**
 * Unwrap result with default value
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.success ? result.data : defaultValue;
}

/**
 * Map success value to a new value
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.success ? ok(fn(result.data)) : result;
}

/**
 * Map error value to a new error
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return result.success ? result : err(fn(result.error));
}

/**
 * Chain operations on success results (flatMap/andThen)
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return result.success ? fn(result.data) : result;
}
