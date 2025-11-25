/**
 * Session Types
 * Defines session-related type definitions
 */

/**
 * Session data stored in cookie
 */
export interface SessionData {
  userId: string;
  username: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * User context available in authenticated requests
 */
export interface UserContext {
  userId: bigint;
  username: string;
}
