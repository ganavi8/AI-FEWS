ALTER TABLE environment_snapshots
  ADD UNIQUE KEY uq_environment_location_capture (location_id, captured_at);

ALTER TABLE risk_snapshots
  ADD UNIQUE KEY uq_risk_location_evaluation (location_id, evaluated_at);

ALTER TABLE notification_preferences
  MODIFY COLUMN heavy_rain TINYINT(1) NOT NULL DEFAULT 0,
  MODIFY COLUMN high_risk TINYINT(1) NOT NULL DEFAULT 0,
  MODIFY COLUMN environmental TINYINT(1) NOT NULL DEFAULT 0,
  MODIFY COLUMN community_system TINYINT(1) NOT NULL DEFAULT 0;
