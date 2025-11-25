/**
 * Database Migration Script
 * Run this script to apply migrations to the database
 */

import { migrate } from "https://esm.sh/drizzle-orm@0.29.0/postgres-js/migrator";
import { db, sql } from "./db.ts";

/**
 * Run database migrations
 */
async function runMigrations() {
  console.log("Starting database migrations...");

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✓ Migrations completed successfully");
  } catch (error) {
    console.error("✗ Migration failed:", error);
    throw error;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

// Run migrations if this script is executed directly
if (import.meta.main) {
  runMigrations()
    .then(() => {
      console.log("Migration process completed");
      Deno.exit(0);
    })
    .catch((error) => {
      console.error("Migration process failed:", error);
      Deno.exit(1);
    });
}

export { runMigrations };
