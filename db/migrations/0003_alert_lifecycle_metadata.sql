ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS source_kind VARCHAR(24) NOT NULL DEFAULT 'AI_RULE' AFTER source,
  ADD COLUMN IF NOT EXISTS authority VARCHAR(160) NULL AFTER source_kind,
  ADD COLUMN IF NOT EXISTS source_url VARCHAR(500) NULL AFTER authority,
  ADD COLUMN IF NOT EXISTS external_alert_id VARCHAR(160) NULL AFTER source_url,
  ADD COLUMN IF NOT EXISTS alert_status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' AFTER external_alert_id,
  ADD COLUMN IF NOT EXISTS acknowledged_at DATETIME(3) NULL AFTER alert_status,
  ADD COLUMN IF NOT EXISTS acknowledged_by CHAR(64) NULL AFTER acknowledged_at,
  ADD COLUMN IF NOT EXISTS detected_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) AFTER acknowledged_by,
  ADD COLUMN IF NOT EXISTS updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) AFTER detected_at,
  ADD COLUMN IF NOT EXISTS change_type VARCHAR(32) NULL AFTER updated_at;

UPDATE alerts
SET detected_at = COALESCE(detected_at, created_at),
    updated_at = COALESCE(updated_at, created_at),
    alert_status = COALESCE(alert_status, 'ACTIVE'),
    source_kind = COALESCE(source_kind, 'AI_RULE')
WHERE detected_at IS NULL OR updated_at IS NULL OR alert_status IS NULL OR source_kind IS NULL;

CREATE INDEX IF NOT EXISTS idx_alert_owner_status_created
  ON alerts (owner_hash, alert_status, created_at);

CREATE INDEX IF NOT EXISTS idx_alert_location_status_created
  ON alerts (location_id, alert_status, created_at);

CREATE INDEX IF NOT EXISTS idx_alert_source_kind_external_id
  ON alerts (source_kind, external_alert_id);
