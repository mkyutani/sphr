/**
 * Drizzle ORM Configuration
 * Used for generating migrations and introspecting the database
 */

import type { Config } from "https://esm.sh/drizzle-kit@0.20.6";

export default {
  schema: "./src/backend/models/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: Deno.env.get("DATABASE_URL") ||
      "postgres://sphr_user:sphr_password@localhost:5432/sphr_db",
  },
  verbose: true,
  strict: true,
} satisfies Config;
