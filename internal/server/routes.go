package server

import (
	"net/http"
	"path/filepath"
	"strings"
)

func (s *Server) api(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) == 2 {
		switch parts[1] {
		case "health":
			writeJSON(w, 200, map[string]any{"status": "ok", "version": s.Version, "project": filepath.Base(s.Engine.Root), "read_only": false, "history_read_only": true, "fork_enabled": true, "csrf_token": s.csrfToken, "prompt_mode": s.Engine.Config.Capture.PromptMode, "capture": "baseline_observed_final_manual"})
			return
		case "sessions":
			s.sessions(w, r)
			return
		case "forks":
			s.restoredWorkspaces(w, r)
			return
		}
	}
	if len(parts) == 4 && parts[1] == "sessions" {
		id := parts[2]
		if !s.validSession(w, id) {
			return
		}
		switch parts[3] {
		case "title":
			s.renameSession(w, r, id)
			return
		case "operations":
			s.operations(w, r, id)
			return
		case "events":
			s.events(w, r, id)
			return
		case "checkpoints":
			s.checkpoints(w, r, id)
			return
		}
	}
	if (len(parts) == 3 || len(parts) == 4) && parts[1] == "checkpoints" {
		m, ok := s.load(w, parts[2])
		if !ok {
			return
		}
		if len(parts) == 3 {
			v := summary(m)
			n := min(len(m.Omissions), 100)
			v["omissions"] = m.Omissions[:n]
			v["omissions_truncated"] = len(m.Omissions) > n
			writeJSON(w, 200, v)
			return
		}
		switch parts[3] {
		case "fork":
			s.fork(w, r, m.ID)
			return
		case "tree":
			s.tree(w, r, m)
			return
		case "file":
			s.file(w, r, m)
			return
		case "diff":
			s.diff(w, r, m)
			return
		}
	}
	fail(w, 404, "not_found", "API endpoint not found.")
}
