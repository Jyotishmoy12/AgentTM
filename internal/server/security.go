package server

import (
	"crypto/subtle"
	"net/http"
	"strings"
)

func securityHeaders(w http.ResponseWriter) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "no-referrer")
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("Cross-Origin-Resource-Policy", "same-origin")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; worker-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'none'")
}

func (s *Server) allowRequest(w http.ResponseWriter, r *http.Request) bool {
	if !s.desktop && r.Host != s.Address {
		fail(w, 403, "untrusted_host", "Open the printed 127.0.0.1 URL.")
		return false
	}
	if !s.desktop {
		if o := r.Header.Get("Origin"); o != "" && o != "http://"+s.Address {
			fail(w, 403, "untrusted_origin", "Cross-origin requests are not allowed.")
			return false
		}
		if site := r.Header.Get("Sec-Fetch-Site"); site != "" && site != "none" && site != "same-origin" {
			fail(w, 403, "untrusted_origin", "Cross-origin requests are not allowed.")
			return false
		}
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	forkPost := r.Method == http.MethodPost && len(parts) == 4 && parts[0] == "api" && parts[1] == "checkpoints" && parts[3] == "fork"
	titlePost := r.Method == http.MethodPost && len(parts) == 4 && parts[0] == "api" && parts[1] == "sessions" && parts[3] == "title"
	if r.Method != http.MethodGet && !forkPost && !titlePost {
		w.Header().Set("Allow", "GET, POST")
		fail(w, 405, "method_not_allowed", "Only reads and explicit checkpoint restore or session naming actions are supported.")
		return false
	}
	if (forkPost || titlePost) && ((!s.desktop && r.Header.Get("Origin") != "http://"+s.Address) || subtle.ConstantTimeCompare([]byte(r.Header.Get("X-AgentTM-CSRF")), []byte(s.csrfToken)) != 1) {
		fail(w, 403, "csrf_required", "This action requires the UI's same-origin confirmation token. Refresh the page and retry.")
		return false
	}
	if len(r.URL.RawQuery) > 8192 {
		fail(w, 400, "invalid_query", "Query is too long.")
		return false
	}

	return true
}
