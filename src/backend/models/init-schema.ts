/**
 * Initialize Database Schema
 * This script creates all tables directly without using migrations
 */

import { db, sql } from "./db.ts";

async function initializeSchema() {
  console.log("Creating database tables...");

  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        user_id BIGSERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Created users table");

    // Create index on username
    await sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`;

    // Create data_type_master table
    await sql`
      CREATE TABLE IF NOT EXISTS data_type_master (
        data_type_id BIGSERIAL PRIMARY KEY,
        data_type_name VARCHAR(100) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Created data_type_master table");

    // Create indexes on data_type_master
    await sql`CREATE INDEX IF NOT EXISTS idx_data_type_master_is_active ON data_type_master(is_active);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_data_type_master_display_order ON data_type_master(display_order);`;

    // Create health_data table
    await sql`
      CREATE TABLE IF NOT EXISTS health_data (
        health_data_id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        data_type_id BIGINT NOT NULL REFERENCES data_type_master(data_type_id),
        measurement_date DATE NOT NULL,
        value DECIMAL(10, 2) NOT NULL,
        memo TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Created health_data table");

    // Create unique index and other indexes on health_data
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS health_data_user_data_type_date_unique ON health_data(user_id, data_type_id, measurement_date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_health_data_user_date ON health_data(user_id, measurement_date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_health_data_user_type_date ON health_data(user_id, data_type_id, measurement_date);`;

    // Create data_export table
    await sql`
      CREATE TABLE IF NOT EXISTS data_export (
        export_id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        format VARCHAR(10) NOT NULL,
        exported_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Created data_export table");

    // Create index on data_export
    await sql`CREATE INDEX IF NOT EXISTS idx_data_export_user ON data_export(user_id, exported_at);`;

    // Create access_log table
    await sql`
      CREATE TABLE IF NOT EXISTS access_log (
        log_id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        operation VARCHAR(50) NOT NULL,
        target_type VARCHAR(50) NOT NULL,
        target_id BIGINT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Created access_log table");

    // Create indexes on access_log
    await sql`CREATE INDEX IF NOT EXISTS idx_access_log_user_created_at ON access_log(user_id, created_at);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_access_log_operation ON access_log(operation);`;

    console.log("✓ All tables created successfully");

    // Insert initial data types
    await sql`
      INSERT INTO data_type_master (data_type_name, unit, display_order)
      VALUES
        ('体重', 'kg', 1),
        ('体温', '°C', 2),
        ('血圧(最高)', 'mmHg', 3),
        ('血圧(最低)', 'mmHg', 4),
        ('心拍数', 'bpm', 5)
      ON CONFLICT DO NOTHING;
    `;
    console.log("✓ Inserted initial data types");

    console.log("\n✓ Database initialization completed successfully");
  } catch (error) {
    console.error("✗ Schema initialization failed:", error);
    throw error;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

// Run initialization if this script is executed directly
if (import.meta.main) {
  initializeSchema()
    .then(() => {
      console.log("Schema initialization process completed");
      Deno.exit(0);
    })
    .catch((error) => {
      console.error("Schema initialization process failed:", error);
      Deno.exit(1);
    });
}

export { initializeSchema };
