package server

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"agenttm/internal/storage"
)

func cursor(r *http.Request) (int64, error) {
	v := r.URL.Query().Get("cursor")
	if v == "" {
		return 0, nil
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil || n < 0 {
		return 0, fmt.Errorf("cursor must be a nonnegative integer")
	}
	return n, nil
}

func (s *Server) operations(w http.ResponseWriter, r *http.Request, id string) {
	after, err := cursor(r)
	if err != nil {
		fail(w, 400, "invalid_cursor", err.Error())
		return
	}
	limit, err := queryInt(r, "limit", 50, 99)
	if err != nil || limit == 0 {
		fail(w, 400, "invalid_limit", "Operation limit must be 1..99.")
		return
	}
	items, err := s.Engine.Store.Operations(id, after, limit+1)
	if err != nil {
		fail(w, 500, "database_error", "Cannot read operation checkpoints.")
		return
	}
	var next any
	if len(items) > limit {
		next = items[limit-1].Cursor
		items = items[:limit]
	}
	writeJSON(w, 200, map[string]any{"items": items, "next_cursor": next})
}
func (s *Server) sessions(w http.ResponseWriter, r *http.Request) {
	after, err := cursor(r)
	if err != nil {
		fail(w, 400, "invalid_cursor", err.Error())
		return
	}
	limit, err := queryInt(r, "limit", 50, 100)
	if err != nil || limit == 0 {
		fail(w, 400, "invalid_limit", "Session limit must be 1..100.")
		return
	}
	rows, err := s.Engine.Store.DB.Query("SELECT rowid,id,agent,started_at,ended_at,status,exit_code,upstream_session_id FROM sessions WHERE project_id=? AND (?=0 OR rowid<?) ORDER BY rowid DESC LIMIT ?", s.Engine.Store.ProjectID, after, after, limit+1)
	if err != nil {
		fail(w, 500, "database_error", "Cannot read sessions.")
		return
	}
	defer rows.Close()
	items := []map[string]any{}
	var last int64
	var next any
	for rows.Next() {
		var rowid int64
		var id, agent, start, status string
		var end sql.NullString
		var exit sql.NullInt64
		var upstream sql.NullString
		if err = rows.Scan(&rowid, &id, &agent, &start, &end, &status, &exit, &upstream); err != nil {
			fail(w, 500, "database_error", "Cannot read session.")
			return
		}
		if len(items) == limit {
			next = last
			break
		}
		var ended, code any
		if end.Valid {
			ended = end.String
		}
		if exit.Valid {
			code = exit.Int64
		}
		items = append(items, map[string]any{"id": id, "agent": agent, "started_at": start, "ended_at": ended, "status": status, "exit_code": code, "resumable": upstream.Valid && upstream.String != "" && status != "active"})
		last = rowid
	}
	if err = rows.Err(); err != nil {
		fail(w, 500, "database_error", "Cannot read sessions.")
		return
	}
	writeJSON(w, 200, map[string]any{"items": items, "next_cursor": next})
}
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
func (s *Server) checkpoints(w http.ResponseWriter, r *http.Request, id string) {
	after, err := cursor(r)
	if err != nil {
		fail(w, 400, "invalid_cursor", err.Error())
		return
	}
	limit, err := queryInt(r, "limit", 50, 100)
	if err != nil || limit == 0 {
		fail(w, 400, "invalid_limit", "Checkpoint limit must be 1..100.")
		return
	}
	rows, err := s.Engine.Store.DB.Query("SELECT rowid,id FROM checkpoints WHERE session_id=? AND rowid>? ORDER BY rowid LIMIT ?", id, after, limit+1)
	if err != nil {
		fail(w, 500, "database_error", "Cannot list checkpoints.")
		return
	}
	type ref struct {
		rowid int64
		id    string
	}
	var refs []ref
	for rows.Next() {
		var v ref
		if err = rows.Scan(&v.rowid, &v.id); err != nil {
			rows.Close()
			fail(w, 500, "database_error", "Cannot read checkpoint.")
			return
		}
		refs = append(refs, v)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		fail(w, 500, "database_error", "Cannot read checkpoints.")
		return
	}
	items := []map[string]any{}
	var next any
	for i, v := range refs {
		if i == limit {
			next = refs[i-1].rowid
			break
		}
		m, ok := s.load(w, v.id)
		if !ok {
			return
		}
		items = append(items, summary(m))
	}
	var last int64
	if len(items) > 0 {
		last = refs[len(items)-1].rowid
	}
	writeJSON(w, 200, map[string]any{"items": items, "next_cursor": next, "last_cursor": last})
}
