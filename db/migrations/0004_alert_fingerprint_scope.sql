ALTER TABLE alerts
  DROP INDEX uq_alert_fingerprint;

CREATE INDEX idx_alert_owner_fingerprint
  ON alerts (owner_hash, fingerprint);

CREATE INDEX idx_alert_owner_fingerprint_status
  ON alerts (owner_hash, fingerprint, alert_status);
