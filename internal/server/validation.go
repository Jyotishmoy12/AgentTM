package server

import (
	"net/http"
	"strings"

	"agenttm/internal/snapshot"
)

func (s *Server) load(w http.ResponseWriter, id string) (snapshot.Manifest, bool) {
	if !snapshot.ValidID(id) {
		fail(w, 400, "invalid_id", "Expected a checkpoint UUID.")
		return snapshot.Manifest{}, false
	}
	m, err := s.Engine.Load(id)
	if err != nil {
		if strings.Contains(err.Error(), "not found in current project") {
			fail(w, 404, "not_found", "Checkpoint not found in this project.")
		} else {
			fail(w, 500, "checkpoint_unavailable", "Checkpoint storage is missing or corrupt. Run agenttm doctor.")
		}
		return m, false
	}
	return m, true
}
func (s *Server) validSession(w http.ResponseWriter, id string) bool {
	if !snapshot.ValidID(id) {
		fail(w, 400, "invalid_id", "Expected a session UUID.")
		return false
	}
	var n int
	if err := s.Engine.Store.DB.QueryRow("SELECT count(*) FROM sessions WHERE id=? AND project_id=?", id, s.Engine.Store.ProjectID).Scan(&n); err != nil {
		fail(w, 500, "database_error", "Cannot read session.")
		return false
	}
	if n != 1 {
		fail(w, 404, "not_found", "Session not found in this project.")
		return false
	}
	return true
}
