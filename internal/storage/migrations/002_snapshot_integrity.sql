ALTER TABLE checkpoints ADD COLUMN manifest_sha256 TEXT NOT NULL DEFAULT '';
CREATE INDEX idx_checkpoints_session_time ON checkpoints(session_id, created_at);
