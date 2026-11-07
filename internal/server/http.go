package server

import (
	"net/http"
	"strings"
)

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	securityHeaders(w)
	if !s.allowRequest(w, r) {
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
