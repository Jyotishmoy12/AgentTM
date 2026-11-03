package storage

import (
	"encoding/json"
	"fmt"
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

func (s *Store) Operations(session string, after int64, limit int) ([]Operation, error) {
	if after < 0 || limit < 1 || limit > 100 {
		return nil, fmt.Errorf("operation limit must be 1..100 and cursor nonnegative")
	}
	var count int
	if err := s.DB.QueryRow("SELECT count(*) FROM sessions WHERE id=? AND project_id=?", session, s.ProjectID).Scan(&count); err != nil {
		return nil, err
	}
	if count != 1 {
		return nil, fmt.Errorf("session not found in this project")
	}
	rows, err := s.DB.Query(`SELECT rowid,id,run_id,upstream_item_id,upstream_turn_id,tool_name,COALESCE(start_event_id,''),COALESCE(completion_event_id,''),COALESCE(before_checkpoint_id,''),COALESCE(after_checkpoint_id,''),started_at,completed_at,status,capture_status,overlapping,missing_start,changed_paths_json,changed_path_count,error FROM operations WHERE session_id=? AND rowid>? ORDER BY rowid LIMIT ?`, session, after, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Operation{}
	for rows.Next() {
		var op Operation
		var paths string
		if err = rows.Scan(&op.Cursor, &op.ID, &op.RunID, &op.ItemID, &op.TurnID, &op.Tool, &op.StartEventID, &op.CompletionEventID, &op.Before, &op.After, &op.StartedAt, &op.CompletedAt, &op.Status, &op.CaptureStatus, &op.Overlapping, &op.MissingStart, &paths, &op.ChangedPathCount, &op.Error); err != nil {
			return nil, err
		}
		if !json.Valid([]byte(paths)) {
			return nil, fmt.Errorf("invalid operation changed paths")
		}
		op.ChangedPaths = json.RawMessage(paths)
		out = append(out, op)
	}
	return out, rows.Err()
}
