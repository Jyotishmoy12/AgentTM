package server

import (
	"database/sql"
	"net/http"
)

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
	rows, err := s.Engine.Store.DB.Query("SELECT rowid,id,title,agent,started_at,ended_at,status,exit_code,upstream_session_id FROM sessions WHERE project_id=? AND (?=0 OR rowid<?) ORDER BY rowid DESC LIMIT ?", s.Engine.Store.ProjectID, after, after, limit+1)
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
		var id, title, agent, start, status string
		var end sql.NullString
		var exit sql.NullInt64
		var upstream sql.NullString
		if err = rows.Scan(&rowid, &id, &title, &agent, &start, &end, &status, &exit, &upstream); err != nil {
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
		items = append(items, map[string]any{"id": id, "title": title, "agent": agent, "started_at": start, "ended_at": ended, "status": status, "exit_code": code, "resumable": upstream.Valid && upstream.String != "" && status != "active"})
		last = rowid
	}
	if err = rows.Err(); err != nil {
		fail(w, 500, "database_error", "Cannot read sessions.")
		return
	}
	writeJSON(w, 200, map[string]any{"items": items, "next_cursor": next})
}
