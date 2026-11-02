package server

import (
	"context"
	"crypto/subtle"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

//go:embed ui
var frontend embed.FS

const maxResponse = 8 << 20

type Server struct {
	Engine    *snapshot.Engine
	Version   string
	Address   string
	slots     chan struct{}
	csrfToken string
	desktop   bool
}

func New(engine *snapshot.Engine, version, address string) *Server {
	return &Server{Engine: engine, Version: version, Address: address, slots: make(chan struct{}, 2), csrfToken: storage.ID()}
}

// NewDesktop configures the same API/UI handler for a native Wails window.
// The handler is not exposed through a TCP listener in this mode, so browser
// Host/Origin checks are unnecessary while all request-level limits remain.
func NewDesktop(engine *snapshot.Engine, version string) *Server {
	s := New(engine, version, "wails.localhost")
	s.desktop = true
	return s
}
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "no-referrer")
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("Cross-Origin-Resource-Policy", "same-origin")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; worker-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'none'")
	// Host validation prevents DNS rebinding; Origin/Fetch Metadata reject reads
	// initiated by other websites. Mutations additionally require a per-server token.
	if !s.desktop && r.Host != s.Address {
		fail(w, 403, "untrusted_host", "Open the printed 127.0.0.1 URL.")
		return
	}
	if !s.desktop {
		if o := r.Header.Get("Origin"); o != "" && o != "http://"+s.Address {
			fail(w, 403, "untrusted_origin", "Cross-origin requests are not allowed.")
			return
		}
		if site := r.Header.Get("Sec-Fetch-Site"); site != "" && site != "none" && site != "same-origin" {
			fail(w, 403, "untrusted_origin", "Cross-origin requests are not allowed.")
			return
		}
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	forkPost := r.Method == http.MethodPost && len(parts) == 4 && parts[0] == "api" && parts[1] == "checkpoints" && parts[3] == "fork"
	if r.Method != http.MethodGet && !forkPost {
		w.Header().Set("Allow", "GET, POST")
		fail(w, 405, "method_not_allowed", "Only reads and the explicit checkpoint fork action are supported.")
		return
	}
	if forkPost && ((!s.desktop && r.Header.Get("Origin") != "http://"+s.Address) || subtle.ConstantTimeCompare([]byte(r.Header.Get("X-AgentTM-CSRF")), []byte(s.csrfToken)) != 1) {
		fail(w, 403, "csrf_required", "Fork requires this UI's same-origin confirmation token. Refresh the page and retry.")
		return
	}
	if len(r.URL.RawQuery) > 8192 {
		fail(w, 400, "invalid_query", "Query is too long.")
		return
	}
	if strings.HasPrefix(r.URL.Path, "/api/") {
		select {
		case s.slots <- struct{}{}:
			defer func() { <-s.slots }()
		case <-r.Context().Done():
			return
		}
		s.api(w, r)
		return
	}
	s.static(w, r)
}
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
func writeJSON(w http.ResponseWriter, status int, v any) {
	b, err := json.Marshal(v)
	if err != nil {
		fail(w, 500, "encoding_failed", "Could not encode response.")
		return
	}
	if len(b) > maxResponse {
		fail(w, 413, "response_limit", "Response exceeds 8 MiB; request a smaller page.")
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write(b)
}
func fail(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"error": map[string]string{"code": code, "message": message}})
}
func queryInt(r *http.Request, name string, def, max int) (int, error) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return def, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < 0 || n > max {
		return 0, fmt.Errorf("invalid %s (0..%d)", name, max)
	}
	return n, nil
}
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
		}
	}
	if len(parts) == 4 && parts[1] == "sessions" {
		id := parts[2]
		if !s.validSession(w, id) {
			return
		}
		switch parts[3] {
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
			return
		case "file":
			s.file(w, r, m)
			return
		case "diff":
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
			return
		}
	}
	fail(w, 404, "not_found", "API endpoint not found.")
}
func summary(m snapshot.Manifest) map[string]any {
	return map[string]any{"id": m.ID, "session_id": m.SessionID, "parent_id": m.ParentID, "event_id": m.EventID, "created_at": m.CreatedAt, "kind": m.Kind, "partial": m.Partial, "potentially_inconsistent": m.PotentiallyInconsistent, "fidelity": m.Fidelity, "file_count": len(m.Files), "omission_count": len(m.Omissions), "base_commit": m.BaseCommit}
}
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

// Serve owns only its listener; the caller owns the DB and context. Opening a
// browser happens only after the listener is ready, using the actual bound port.
func Serve(ctx context.Context, engine *snapshot.Engine, version string, port int, ready func(string)) error {
	if port < 0 || port > 65535 {
		return fmt.Errorf("port must be 0..65535")
	}
	listener, err := net.Listen("tcp", net.JoinHostPort("127.0.0.1", strconv.Itoa(port)))
	if err != nil {
		return fmt.Errorf("cannot start local UI: %w; try --port 7332", err)
	}
	address := listener.Addr().String()
	app := New(engine, version, address)
	srv := &http.Server{Handler: app, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 6 * time.Minute, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16 << 10}
	stopped := make(chan struct{})
	defer close(stopped)
	go func() {
		select {
		case <-ctx.Done():
			shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_ = srv.Shutdown(shutdown)
		case <-stopped:
		}
	}()
	if ready != nil {
		ready("http://" + address)
	}
	err = srv.Serve(listener)
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}
