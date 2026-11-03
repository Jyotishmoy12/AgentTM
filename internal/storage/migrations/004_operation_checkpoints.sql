CREATE TABLE operations (
 id TEXT PRIMARY KEY,
 session_id TEXT NOT NULL REFERENCES sessions(id),
 run_id TEXT NOT NULL,
 upstream_item_id TEXT NOT NULL,
 upstream_turn_id TEXT NOT NULL DEFAULT '',
 tool_name TEXT NOT NULL,
 start_event_id TEXT REFERENCES events(id),
 completion_event_id TEXT REFERENCES events(id),
 before_checkpoint_id TEXT REFERENCES checkpoints(id),
 after_checkpoint_id TEXT REFERENCES checkpoints(id),
 started_at TEXT NOT NULL,
 completed_at TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'running',
 capture_status TEXT NOT NULL DEFAULT 'pending',
 overlapping INTEGER NOT NULL DEFAULT 0,
 missing_start INTEGER NOT NULL DEFAULT 0,
 changed_paths_json TEXT NOT NULL DEFAULT '[]',
 changed_path_count INTEGER NOT NULL DEFAULT 0,
 error TEXT NOT NULL DEFAULT '',
 UNIQUE(session_id,run_id,upstream_item_id)
);
CREATE INDEX idx_operations_session_order ON operations(session_id,started_at);
