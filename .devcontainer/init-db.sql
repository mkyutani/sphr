-- Personal Healthcare Record Database Initialization Script
-- Based on design.md specifications

-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Data Type Master table
CREATE TABLE IF NOT EXISTS data_type_master (
  data_type_id BIGSERIAL PRIMARY KEY,
  data_type_name VARCHAR(100) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_type_master_is_active ON data_type_master(is_active);
CREATE INDEX IF NOT EXISTS idx_data_type_master_display_order ON data_type_master(display_order);

-- Insert initial data types
INSERT INTO data_type_master (data_type_name, unit, display_order) VALUES
  ('血圧(上)', 'mmHg', 1),
  ('血圧(下)', 'mmHg', 2),
  ('脈拍', 'bpm', 3),
  ('体重', 'kg', 4)
ON CONFLICT DO NOTHING;

-- Health Data table
CREATE TABLE IF NOT EXISTS health_data (
  health_data_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  data_type_id BIGINT NOT NULL REFERENCES data_type_master(data_type_id),
  measurement_date DATE NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  memo TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, data_type_id, measurement_date)
);

-- Performance optimization indexes
CREATE INDEX IF NOT EXISTS idx_health_data_user_date ON health_data(user_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_data_user_type_date ON health_data(user_id, data_type_id, measurement_date DESC);

-- Data Export table
CREATE TABLE IF NOT EXISTS data_export (
  export_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  format VARCHAR(10) NOT NULL CHECK (format IN ('PDF', 'CSV')),
  exported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_export_user ON data_export(user_id, exported_at DESC);

-- Create a test user (password: 'testpassword123')
-- Note: In production, password should be hashed with bcrypt
INSERT INTO users (username, password_hash) VALUES
  ('testuser', '$2b$10$YourBcryptHashHere')
ON CONFLICT DO NOTHING;
