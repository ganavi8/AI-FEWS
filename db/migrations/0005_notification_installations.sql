CREATE TABLE IF NOT EXISTS notification_installations (
  installation_id VARCHAR(96) NOT NULL PRIMARY KEY,
  owner_hash CHAR(64) NOT NULL,
  platform VARCHAR(16) NOT NULL,
  push_token VARCHAR(2048) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NULL,
  KEY idx_notification_owner (owner_hash),
  KEY idx_notification_owner_enabled (owner_hash, enabled),
  KEY idx_notification_token (push_token(191)),
  CONSTRAINT chk_notification_platform CHECK (platform IN ('ANDROID', 'WEB'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
