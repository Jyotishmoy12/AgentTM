package server

import (
	"net/http"

	"agenttm/internal/snapshot"
)

func (s *Server) diff(w http.ResponseWriter, r *http.Request, m snapshot.Manifest) {
	against := r.URL.Query().Get("against")
	if against != "" && against != "parent" {
		fail(w, 400, "invalid_against", "Only comparison against parent is supported.")
		return
	}
	offset, err := queryInt(r, "cursor", 0, snapshot.MaxFiles*2)
	if err != nil {
		fail(w, 400, "invalid_cursor", err.Error())
		return
	}
	limit, err := queryInt(r, "limit", 20, 100)
	if err != nil || limit == 0 {
		fail(w, 400, "invalid_limit", "Diff limit must be 1..100.")
		return
	}
	changes, total, err := s.Engine.DiffPage(m.ID, offset, limit)
	if err != nil {
		fail(w, 500, "diff_unavailable", "Cannot read historical diff. Run agenttm doctor.")
		return
	}
	var next any
	if offset+len(changes) < total {
		next = offset + len(changes)
	}
	writeJSON(w, 200, map[string]any{"items": changes, "next_cursor": next, "total": total, "against": m.ParentID})
}
