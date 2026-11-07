package server

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
)

//go:embed ui
var frontend embed.FS

func (s *Server) static(w http.ResponseWriter, r *http.Request) {
	p := strings.TrimPrefix(r.URL.Path, "/")
	if p == "" {
		p = "index.html"
	}
	if !fs.ValidPath(p) || strings.Contains(p, "..") || strings.HasPrefix(p, ".") {
		fail(w, 404, "not_found", "Asset not found.")
		return
	}
	assets, err := fs.Sub(frontend, "ui")
	if err != nil {
		fail(w, 500, "frontend_missing", "Rebuild the frontend before building AgentTM.")
		return
	}
	f, err := assets.Open(p)
	if err != nil {
		fail(w, 404, "not_found", "Asset not found.")
		return
	}
	f.Close()
	http.FileServer(http.FS(assets)).ServeHTTP(w, r)
}
