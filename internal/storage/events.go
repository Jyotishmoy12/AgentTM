package storage

import (
	"encoding/json"
	"fmt"
)

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
	_, e = tx.Exec("INSERT INTO events(id,session_id,sequence,kind,tool_name,tool_call_id,received_at,payload_json) SELECT ?,?,COALESCE(MAX(sequence),0)+1,?,?,?,?,? FROM events WHERE session_id=?", id, session, kind, tool, call, Now(), string(payload), session)
	if e != nil {
		return "", e
	}
	return id, tx.Commit()
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
