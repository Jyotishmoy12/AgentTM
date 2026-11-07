package storage

import (
	"database/sql"
	"encoding/json"
)

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
	Title     string         `json:"title"`
	Agent     string         `json:"agent"`
	StartedAt string         `json:"started_at"`
	EndedAt   sql.NullString `json:"ended_at"`
	Status    string         `json:"status"`
	ExitCode  sql.NullInt64  `json:"exit_code"`
}
