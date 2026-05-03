CREATE TABLE creators (
  creator_id TEXT PRIMARY KEY,
  booth_shop_url TEXT NOT NULL UNIQUE,
  display_name TEXT,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE items (
  item_id TEXT PRIMARY KEY,
  booth_url TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  creator_id TEXT REFERENCES creators(creator_id),
  unavailable_at TEXT,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_indexed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL UNIQUE,
  public_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  banned_at TEXT,
  deleted_at TEXT
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(item_id),
  user_id TEXT NOT NULL REFERENCES users(user_id),
  rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  body TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ja', 'other')),
  purchase_state TEXT NOT NULL DEFAULT 'unknown' CHECK (purchase_state IN ('unknown', 'not_detected', 'appears_purchased')),
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'pending', 'deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  UNIQUE(item_id, user_id)
);

CREATE TABLE review_votes (
  review_id TEXT NOT NULL REFERENCES reviews(id),
  user_id TEXT NOT NULL REFERENCES users(user_id),
  value INTEGER NOT NULL CHECK (value IN (1, -1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (review_id, user_id)
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id),
  reporter_id TEXT NOT NULL REFERENCES users(user_id),
  reason TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  resolved_by TEXT REFERENCES users(user_id),
  resolution TEXT
);

CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  bucket TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (key, bucket)
);

CREATE INDEX idx_reviews_item_visible ON reviews(item_id, status, created_at);
CREATE INDEX idx_reviews_user ON reviews(user_id, created_at);
CREATE INDEX idx_reports_unresolved ON reports(resolved_at, created_at);
CREATE INDEX idx_sessions_user ON sessions(user_id, expires_at);
CREATE INDEX idx_votes_review ON review_votes(review_id);
CREATE INDEX idx_rate_limits_bucket ON rate_limits(bucket);
