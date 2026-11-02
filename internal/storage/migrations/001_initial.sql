CREATE TABLE projects (id TEXT PRIMARY KEY, root_path TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL);
CREATE TABLE sessions (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), upstream_session_id TEXT, agent TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT, status TEXT NOT NULL DEFAULT 'active', exit_code INTEGER);
CREATE TABLE events (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), sequence INTEGER NOT NULL, kind TEXT NOT NULL, tool_name TEXT, tool_call_id TEXT, occurred_at TEXT, received_at TEXT NOT NULL, payload_json TEXT NOT NULL, checkpoint_id TEXT, UNIQUE(session_id, sequence));
CREATE INDEX idx_events_session_seq ON events(session_id, sequence);
CREATE TABLE checkpoints (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), parent_id TEXT, event_id TEXT, manifest_path TEXT NOT NULL, created_at TEXT NOT NULL, partial INTEGER NOT NULL DEFAULT 0);
CREATE TABLE forks (id TEXT PRIMARY KEY, checkpoint_id TEXT NOT NULL REFERENCES checkpoints(id), worktree_path TEXT NOT NULL, branch_name TEXT NOT NULL, created_at TEXT NOT NULL);
