package storage

import (
	"encoding/json"
)

type Operation struct {
	ID                string          `json:"id"`
	RunID             string          `json:"run_id"`
	ItemID            string          `json:"item_id"`
	TurnID            string          `json:"turn_id"`
	Tool              string          `json:"tool"`
	StartEventID      string          `json:"start_event_id"`
	CompletionEventID string          `json:"completion_event_id"`
	Before            string          `json:"before_checkpoint_id"`
	After             string          `json:"after_checkpoint_id"`
	StartedAt         string          `json:"started_at"`
	CompletedAt       string          `json:"completed_at"`
	Status            string          `json:"status"`
	CaptureStatus     string          `json:"capture_status"`
	Overlapping       bool            `json:"overlapping"`
	MissingStart      bool            `json:"missing_start"`
	ChangedPaths      json.RawMessage `json:"changed_paths"`
	ChangedPathCount  int             `json:"changed_path_count"`
	Error             string          `json:"error"`
	Cursor            int64           `json:"cursor"`
}
