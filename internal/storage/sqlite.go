package storage

import (
	"crypto/rand"
	"database/sql"
	_ "embed"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"agenttm/internal/project"
	_ "modernc.org/sqlite"
)

//go:embed migrations/001_initial.sql
var initial string

//go:embed migrations/002_snapshot_integrity.sql
var snapshotMigration string

//go:embed migrations/003_fork_status.sql
var forkMigration string

type Store struct {
	DB        *sql.DB
	ProjectID string
}
type Event struct {
	ID           string          `json:"id"`
	SessionID    string          `json:"session_id"`
	Sequence     int64           `json:"sequence"`
	Kind         string          `json:"kind"`
	ToolName     string          `json:"tool_name,omitempty"`
	ToolCallID   string          `json:"tool_call_id,omitempty"`
	ReceivedAt   string          `json:"received_at"`
	Payload      json.RawMessage `json:"payload"`
	CheckpointID string          `json:"checkpoint_id,omitempty"`
}
type Session struct {
	ID        string         `json:"id"`
	Agent     string         `json:"agent"`
	StartedAt string         `json:"started_at"`
	EndedAt   sql.NullString `json:"ended_at"`
	Status    string         `json:"status"`
	ExitCode  sql.NullInt64  `json:"exit_code"`
}

func ID() string {
	b := make([]byte, 16)
	if _, e := rand.Read(b); e != nil {
		panic(e)
	}
	b[6] = (b[6] & 15) | 64
	b[8] = (b[8] & 63) | 128
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[:4], b[4:6], b[6:8], b[8:10], b[10:])
}
func Now() string { return time.Now().UTC().Format(time.RFC3339Nano) }
func Open(root string) (*Store, error) {
	// Store identity must agree with CLI repository discovery even when callers
	// pass an OS alias such as macOS's /var temporary-directory prefix.
	canonical, err := filepath.EvalSymlinks(root)
	if err != nil {
		return nil, err
	}
	root, err = filepath.Abs(canonical)
	if err != nil {
		return nil, err
	}
	path := filepath.Join(root, ".agenttm", "data", "events.db")
	if e := project.SafePath(path); e != nil {
		return nil, e
	}
	for _, suffix := range []string{"-wal", "-shm", "-journal"} {
		if e := project.SafePath(path + suffix); e != nil {
			return nil, e
		}
	}
	f, e := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0600)
	if e != nil {
		return nil, e
	}
	if e = f.Close(); e != nil {
		return nil, e
	}
	db, e := sql.Open("sqlite", path)
	if e != nil {
		return nil, e
	}
	db.SetMaxOpenConns(1)
	fail := func(e error) (*Store, error) { db.Close(); return nil, e }
	for _, q := range []string{"PRAGMA foreign_keys=ON", "PRAGMA busy_timeout=5000", "PRAGMA journal_mode=WAL"} {
		if _, e = db.Exec(q); e != nil {
			return fail(e)
		}
	}
	tx, e := db.Begin()
	if e != nil {
		return fail(e)
	}
	defer tx.Rollback()
	var v int
	if e = tx.QueryRow("PRAGMA user_version").Scan(&v); e != nil {
		return fail(e)
	}
	if v > 3 {
		return fail(fmt.Errorf("database schema %d is newer than supported version 3", v))
	}
	if v == 0 {
		if _, e = tx.Exec(initial); e != nil {
			return fail(e)
		}
		if _, e = tx.Exec("PRAGMA user_version=1"); e != nil {
			return fail(e)
		}
	}
	if v < 2 {
		if _, e = tx.Exec(snapshotMigration); e != nil {
			return fail(e)
		}
		if _, e = tx.Exec("PRAGMA user_version=2"); e != nil {
			return fail(e)
		}
	}
	if v < 3 {
		if _, e = tx.Exec(forkMigration); e != nil {
			return fail(e)
		}
		if _, e = tx.Exec("PRAGMA user_version=3"); e != nil {
			return fail(e)
		}
	}
	id := ID()
	if _, e = tx.Exec("INSERT INTO projects VALUES (?, ?, ?) ON CONFLICT(root_path) DO NOTHING", id, root, Now()); e != nil {
		return fail(e)
	}
	if e = tx.QueryRow("SELECT id FROM projects WHERE root_path=?", root).Scan(&id); e != nil {
		return fail(e)
	}
	if e = tx.Commit(); e != nil {
		return fail(e)
	}
	return &Store{db, id}, nil
}
func (s *Store) Start() (string, error) {
	id := ID()
	_, e := s.DB.Exec("INSERT INTO sessions(id,project_id,agent,started_at) VALUES (?,?,'codex',?)", id, s.ProjectID, Now())
	return id, e
}
func (s *Store) Finish(id, status string, code int) error {
	_, e := s.DB.Exec("UPDATE sessions SET ended_at=?,status=?,exit_code=? WHERE id=? AND project_id=?", Now(), status, code, id, s.ProjectID)
	return e
}
func (s *Store) Append(session, kind, tool, call string, payload []byte) error {
	_, err := s.AppendID(session, kind, tool, call, payload)
	return err
}
func (s *Store) AppendID(session, kind, tool, call string, payload []byte) (string, error) {
	id := ID()
	tx, e := s.DB.Begin()
	if e != nil {
		return "", e
	}
	defer tx.Rollback()
	// One write statement allocates sequence and inserts the receipt. This avoids
	// upgrading an earlier read transaction when another recorder is writing.
	_, e = tx.Exec("INSERT INTO events(id,session_id,sequence,kind,tool_name,tool_call_id,received_at,payload_json) SELECT ?,?,COALESCE(MAX(sequence),0)+1,?,?,?,?,? FROM events WHERE session_id=?", id, session, kind, tool, call, Now(), string(payload), session)
	if e != nil {
		return "", e
	}
	return id, tx.Commit()
}
func (s *Store) Sessions() ([]Session, error) {
	rows, e := s.DB.Query("SELECT id,agent,started_at,ended_at,status,exit_code FROM sessions WHERE project_id=? ORDER BY started_at DESC", s.ProjectID)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []Session{}
	for rows.Next() {
		var v Session
		if e = rows.Scan(&v.ID, &v.Agent, &v.StartedAt, &v.EndedAt, &v.Status, &v.ExitCode); e != nil {
			return nil, e
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
func (s *Store) Events(id string, after int64, limit int) ([]Event, error) {
	if limit < 1 || limit > 1000 || after < 0 {
		return nil, fmt.Errorf("limit must be 1..1000 and after must be nonnegative")
	}
	var n int
	if e := s.DB.QueryRow("SELECT count(*) FROM sessions WHERE id=? AND project_id=?", id, s.ProjectID).Scan(&n); e != nil {
		return nil, e
	}
	if n == 0 {
		return nil, fmt.Errorf("session not found in this project")
	}
	rows, e := s.DB.Query("SELECT id,session_id,sequence,kind,COALESCE(tool_name,''),COALESCE(tool_call_id,''),received_at,payload_json,COALESCE(checkpoint_id,'') FROM events WHERE session_id=? AND sequence>? ORDER BY sequence LIMIT ?", id, after, limit)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []Event{}
	for rows.Next() {
		var v Event
		var p string
		if e = rows.Scan(&v.ID, &v.SessionID, &v.Sequence, &v.Kind, &v.ToolName, &v.ToolCallID, &v.ReceivedAt, &p, &v.CheckpointID); e != nil {
			return nil, e
		}
		v.Payload = json.RawMessage(p)
		out = append(out, v)
	}
	return out, rows.Err()
}
