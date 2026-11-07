package server

import (
	"net/http"

	"agenttm/internal/snapshot"
)

func (s *Server) file(w http.ResponseWriter, r *http.Request, m snapshot.Manifest) {
	p := r.URL.Query().Get("path")
	if err := snapshot.ValidatePath(p); err != nil {
		fail(w, 400, "invalid_path", "Use a normalized repository-relative path.")
		return
	}
	for _, f := range m.Files {
		if f.Path == p {
			if f.Size > 1<<20 {
				fail(w, 413, "file_limit", "Historical text viewer supports files up to 1 MiB.")
				return
			}
			b, err := s.Engine.ReadObject(f)
			if err != nil {
				fail(w, 500, "object_unavailable", "Historical object is missing or corrupt. Run agenttm doctor.")
				return
			}
			if !snapshot.Text(b) {
				fail(w, 415, "binary_file", "Binary or non-UTF-8 file; contents are not displayed.")
				return
			}
			writeJSON(w, 200, map[string]any{"path": p, "content": string(b), "size": f.Size, "object_id": f.ObjectID})
			return
		}
	}
	fail(w, 404, "file_not_found", "File was not captured in this checkpoint; inspect its omissions.")
}
