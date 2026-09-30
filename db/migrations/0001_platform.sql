CREATE TABLE IF NOT EXISTS community_reports (
  id VARCHAR(96) NOT NULL PRIMARY KEY,
  client_id VARCHAR(96) NOT NULL,
  category VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'COMMUNITY GENERATED',
  sync_status VARCHAR(24) NOT NULL DEFAULT 'SYNCED',
  moderation_status VARCHAR(24) NOT NULL DEFAULT 'PENDING_REVIEW',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_community_client_id (client_id),
  KEY idx_reports_created (created_at),
  KEY idx_reports_geo (latitude, longitude),
  KEY idx_reports_moderation (moderation_status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS saved_locations (
  id VARCHAR(96) NOT NULL PRIMARY KEY,
  owner_hash CHAR(64) NOT NULL,
  name VARCHAR(80) NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY idx_saved_owner_created (owner_hash, created_at),
  CONSTRAINT chk_saved_latitude CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_saved_longitude CHECK (longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS environment_snapshots (
  id VARCHAR(96) NOT NULL PRIMARY KEY,
  owner_hash CHAR(64) NOT NULL,
  location_id VARCHAR(96) NOT NULL,
  provider VARCHAR(80) NOT NULL,
  observed_at DATETIME(3) NULL,
  captured_at DATETIME(3) NOT NULL,
  payload JSON NOT NULL,
  KEY idx_environment_series (owner_hash, location_id, captured_at),
  CONSTRAINT fk_environment_saved_location FOREIGN KEY (location_id) REFERENCES saved_locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS risk_snapshots (
  id VARCHAR(96) NOT NULL PRIMARY KEY,
  owner_hash CHAR(64) NOT NULL,
  location_id VARCHAR(96) NOT NULL,
  risk_level VARCHAR(24) NOT NULL,
  risk_score DECIMAL(6,2) NULL,
  evaluated_at DATETIME(3) NOT NULL,
  explanation JSON NOT NULL,
  KEY idx_risk_series (owner_hash, location_id, evaluated_at),
  CONSTRAINT fk_risk_saved_location FOREIGN KEY (location_id) REFERENCES saved_locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(96) NOT NULL PRIMARY KEY,
  fingerprint VARCHAR(96) NOT NULL,
  owner_hash CHAR(64) NOT NULL,
  location_id VARCHAR(96) NOT NULL,
  severity VARCHAR(24) NOT NULL,
  event_type VARCHAR(48) NOT NULL,
  reason TEXT NOT NULL,
  source VARCHAR(160) NOT NULL,
  data_quality VARCHAR(80) NOT NULL,
  recommended_action TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_alert_fingerprint (fingerprint),
  KEY idx_alert_owner_expiry (owner_hash, expires_at),
  KEY idx_alert_location (location_id, created_at),
  CONSTRAINT fk_alert_saved_location FOREIGN KEY (location_id) REFERENCES saved_locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS notification_preferences (
  owner_hash CHAR(64) NOT NULL PRIMARY KEY,
  heavy_rain TINYINT(1) NOT NULL DEFAULT 1,
  high_risk TINYINT(1) NOT NULL DEFAULT 1,
  environmental TINYINT(1) NOT NULL DEFAULT 0,
  community_system TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS api_rate_limits (
  client_key CHAR(64) NOT NULL,
  rule_key VARCHAR(48) NOT NULL,
  window_id BIGINT NOT NULL,
  hit_count INT NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (client_key, rule_key),
  KEY idx_rate_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS provider_throttles (
  provider VARCHAR(48) NOT NULL PRIMARY KEY,
  last_requested_at DATETIME(3) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
