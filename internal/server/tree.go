package server

import (
	"net/http"

	"agenttm/internal/snapshot"
)

func (s *Server) tree(w http.ResponseWriter, r *http.Request, m snapshot.Manifest) {
	offset, err := queryInt(r, "cursor", 0, snapshot.MaxFiles)
	if err != nil {
		fail(w, 400, "invalid_cursor", err.Error())
		return
	}
	limit, err := queryInt(r, "limit", 250, 1000)
	if err != nil || limit == 0 {
		fail(w, 400, "invalid_limit", "Tree limit must be 1..1000.")
		return
	}
	offset = min(offset, len(m.Files))
	end := min(offset+limit, len(m.Files))
	var next any
	if end < len(m.Files) {
		next = end
	}
	writeJSON(w, 200, map[string]any{"items": m.Files[offset:end], "next_cursor": next, "total": len(m.Files)})
}
