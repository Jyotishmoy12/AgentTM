package server

import "net/http"

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
