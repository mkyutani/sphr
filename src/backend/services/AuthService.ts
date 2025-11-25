/**
 * Authentication Service
 * Handles user registration, password hashing, and verification
 */

import * as bcrypt from "bcrypt";
import type { PostgresJsDatabase } from "https://esm.sh/drizzle-orm@0.29.0/postgres-js";
import { eq } from "https://esm.sh/drizzle-orm@0.29.0";
import { users } from "@backend/models/schema.ts";
import { ConflictError, ValidationError } from "@shared/types/errors.ts";
import { createLogger } from "@backend/utils/logger.ts";

const logger = createLogger("AuthService");

/**
 * Password strength requirements
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_PATTERN = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*(),.?":{}|<>]/,
};

/**
 * Username validation pattern
 */
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,50}$/;

/**
 * Bcrypt cost factor (number of hashing rounds)
 */
const BCRYPT_COST_FACTOR = 12;

/**
 * Authentication Service
 */
export class AuthService {
  constructor(private db: PostgresJsDatabase) {}

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new ValidationError(`パスワードは${PASSWORD_MIN_LENGTH}文字以上である必要があります`);
    }

    const hasUppercase = PASSWORD_PATTERN.uppercase.test(password);
    const hasLowercase = PASSWORD_PATTERN.lowercase.test(password);
    const hasNumber = PASSWORD_PATTERN.number.test(password);
    const hasSpecial = PASSWORD_PATTERN.special.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      throw new ValidationError(
        "パスワードには大文字、小文字、数字、記号を含める必要があります",
      );
    }
  }

  /**
   * Validate username format
   */
  private validateUsername(username: string): void {
    if (!USERNAME_PATTERN.test(username)) {
      if (username.length < 3 || username.length > 50) {
        throw new ValidationError("ユーザー名は3文字以上50文字以下である必要があります");
      }
      throw new ValidationError("ユーザー名は英数字とアンダースコアのみ使用できます");
    }
  }

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(BCRYPT_COST_FACTOR);
    return await bcrypt.hash(password, salt);
  }

  /**
   * Register a new user
   */
  async register(username: string, password: string): Promise<{ userId: bigint; username: string }> {
    logger.info(`User registration attempt: ${username}`);

    // Validate input
    this.validateUsername(username);
    this.validatePassword(password);

    // Check if username already exists
    const existingUser = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser.length > 0) {
      logger.warn(`Registration failed: username already exists - ${username}`);
      throw new ConflictError("このユーザー名は既に使用されています");
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const result = await this.db
      .insert(users)
      .values({
        username,
        passwordHash,
      })
      .returning({
        userId: users.userId,
        username: users.username,
      });

    logger.info(`User registered successfully: ${username}`);

    return result[0];
  }

  /**
   * Verify user password
   */
  async verifyPassword(username: string, password: string): Promise<boolean> {
    logger.debug(`Password verification attempt for user: ${username}`);

    // Get user from database
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (user.length === 0) {
      logger.warn(`Verification failed: user not found - ${username}`);
      return false;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user[0].passwordHash);

    if (isValid) {
      logger.info(`Password verification successful for user: ${username}`);
    } else {
      logger.warn(`Password verification failed for user: ${username}`);
    }

    return isValid;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string) {
    const result = await this.db
      .select({
        userId: users.userId,
        username: users.username,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }
}
