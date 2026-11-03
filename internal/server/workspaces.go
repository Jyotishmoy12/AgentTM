package server

import "net/http"

// restoredWorkspaces lists this project's restore ledger without touching Git
// or the worktrees. Paths describe recorded destinations, not live health.
func (s *Server) restoredWorkspaces(w http.ResponseWriter, r *http.Request) {
	cursor, err := queryInt(r, "cursor", 0, 1<<31-1)
	if err != nil {
		fail(w, 400, "invalid_cursor", err.Error())
		return
	}
	rows, err := s.Engine.Store.DB.Query(`SELECT f.rowid, f.id, f.checkpoint_id, f.branch_name, f.worktree_path, f.status, f.created_at
		FROM forks f JOIN checkpoints c ON c.id=f.checkpoint_id JOIN sessions s ON s.id=c.session_id
		WHERE s.project_id=? AND f.rowid>? ORDER BY f.rowid LIMIT 101`, s.Engine.Store.ProjectID, cursor)
	if err != nil {
		fail(w, 500, "database_error", "Could not load restored workspaces.")
		return
	}
	defer rows.Close()
	items := []map[string]any{}
	last := cursor
	var next any
	for rows.Next() {
		var row int
		var id, checkpoint, branch, path, status, created string
		if err = rows.Scan(&row, &id, &checkpoint, &branch, &path, &status, &created); err != nil {
			fail(w, 500, "database_error", "Could not read restored workspaces.")
			return
		}
		if len(items) == 100 {
			next = last
			break
		}
		items = append(items, map[string]any{"id": id, "checkpoint_id": checkpoint, "branch_name": branch, "worktree_path": path, "status": status, "created_at": created})
		last = row
	}
	if rows.Err() != nil {
		fail(w, 500, "database_error", "Could not read restored workspaces.")
		return
	}
	writeJSON(w, 200, map[string]any{"items": items, "next_cursor": next})
}
