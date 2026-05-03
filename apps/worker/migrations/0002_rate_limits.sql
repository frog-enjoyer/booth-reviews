CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  bucket TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (key, bucket)
);

CREATE INDEX idx_rate_limits_bucket ON rate_limits(bucket);
