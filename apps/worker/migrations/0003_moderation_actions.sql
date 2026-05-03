CREATE TABLE moderation_actions (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  report_id TEXT REFERENCES reports(id),
  moderator_user_id TEXT NOT NULL REFERENCES users(user_id),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_moderation_actions_target ON moderation_actions(target_type, target_id, created_at);
