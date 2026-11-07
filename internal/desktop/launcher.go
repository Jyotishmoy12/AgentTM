package desktop

import (
	"fmt"
	"net/http"
)

func (l *Launcher) Set(handler http.Handler) { l.mu.Lock(); defer l.mu.Unlock(); l.handler = handler }
func (l *Launcher) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	l.mu.RLock()
	handler := l.handler
	l.mu.RUnlock()
	if handler != nil {
		handler.ServeHTTP(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	switch r.URL.Path {
	case "/", "/index.html":
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, welcomeHTML)
	case "/launcher.js":
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		fmt.Fprint(w, welcomeJS)
	case "/welcome.css":
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
		fmt.Fprint(w, welcomeCSS)
	case "/welcome-layout.css":
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
		fmt.Fprint(w, welcomeLayoutCSS)
	default:
		http.NotFound(w, r)
	}
}
