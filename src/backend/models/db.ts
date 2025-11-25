/**
 * Database Connection and Drizzle ORM Configuration
 */

import { drizzle } from "https://esm.sh/drizzle-orm@0.29.0/postgres-js";
import postgres from "https://esm.sh/postgres@3.4.3";
import * as schema from "./schema.ts";

/**
 * Database connection configuration
 */
const databaseUrl = Deno.env.get("DATABASE_URL");

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

/**
 * PostgreSQL client instance
 */
export const sql = postgres(databaseUrl, {
  max: 10, // Maximum number of connections in the pool
  idle_timeout: null, // Keep connections alive (avoid timer cleanup bug)
  connect_timeout: 10, // Connection timeout in seconds
  max_lifetime: null, // Keep connections alive indefinitely
});

/**
 * Drizzle ORM database instance
 */
export const db = drizzle(sql, { schema });

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    console.log("✓ Database connection successful");
    return true;
  } catch (error) {
    console.error("✗ Database connection failed:", error);
    return false;
  }
}

/**
 * Close database connection
 */
export async function closeConnection(): Promise<void> {
  await sql.end({ timeout: 5 });
  console.log("✓ Database connection closed");
}
