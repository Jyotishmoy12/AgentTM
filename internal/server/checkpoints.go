package server

import "net/http"

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
	var refs []checkpointRef
	for rows.Next() {
		var v checkpointRef
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
