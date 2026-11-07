package server

import (
	"encoding/json"
	"net/http"

	"agenttm/internal/storage"
)

func (s *Server) events(w http.ResponseWriter, r *http.Request, id string) {
	after, err := cursor(r)
	if err != nil {
		fail(w, 400, "invalid_cursor", err.Error())
		return
	}
	limit, err := queryInt(r, "limit", 50, 200)
	if err != nil || limit == 0 {
		fail(w, 400, "invalid_limit", "Event limit must be 1..200.")
		return
	}
	rows, err := s.Engine.Store.DB.QueryContext(r.Context(), "SELECT id,session_id,sequence,kind,COALESCE(tool_name,''),COALESCE(tool_call_id,''),received_at,substr(payload_json,1,1048577),COALESCE(checkpoint_id,'') FROM events WHERE session_id=? AND sequence>? ORDER BY sequence LIMIT ?", id, after, limit+1)
	if err != nil {
		fail(w, 500, "database_error", "Cannot read recorded events.")
		return
	}
	defer rows.Close()
	selected := []storage.Event{}
	size := 0
	var next any
	for rows.Next() {
		var v storage.Event
		var payload string
		if err = rows.Scan(&v.ID, &v.SessionID, &v.Sequence, &v.Kind, &v.ToolName, &v.ToolCallID, &v.ReceivedAt, &payload, &v.CheckpointID); err != nil {
			fail(w, 500, "database_error", "Cannot read event.")
			return
		}
		if len(payload) > 1<<20 || !json.Valid([]byte(payload)) {
			fail(w, 500, "invalid_payload", "Stored event is malformed or exceeds its payload limit.")
			return
		}
		v.Payload = json.RawMessage(payload)
		if len(selected) == limit || len(selected) > 0 && size+len(v.Payload) > 3<<20 {
			next = selected[len(selected)-1].Sequence
			break
		}
		selected = append(selected, v)
		size += len(v.Payload)
	}
	if err = rows.Err(); err != nil {
		fail(w, 500, "database_error", "Cannot read events.")
		return
	}
	writeJSON(w, 200, map[string]any{"items": selected, "next_cursor": next})
}
