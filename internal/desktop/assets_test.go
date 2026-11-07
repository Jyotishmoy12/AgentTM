package desktop

import (
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"sync"
	"testing"
)

func TestWelcomeStylesAreEmbeddedAndServed(t *testing.T) {
	l := &Launcher{}
	pattern := regexp.MustCompile(`<link rel="stylesheet" href="([^"]+)"`)
	styles := pattern.FindAllStringSubmatch(welcomeHTML, -1)
	if len(styles) != 2 {
		t.Fatalf("welcome screen lost its stylesheet links: %d", len(styles))
	}
	for _, style := range styles {
		w := httptest.NewRecorder()
		l.ServeHTTP(w, httptest.NewRequest("GET", style[1], nil))
		if w.Code != http.StatusOK || w.Header().Get("Content-Type") != "text/css; charset=utf-8" || w.Body.Len() == 0 {
			t.Fatalf("embedded stylesheet missing: %s, %d", style[1], w.Code)
		}
		if w.Header().Get("Cache-Control") != "no-store" || w.Header().Get("X-Content-Type-Options") != "nosniff" {
			t.Fatalf("stylesheet lost response safeguards: %s", style[1])
		}
	}
	for _, method := range []string{"HEAD", "POST", "PUT", "DELETE"} {
		w := httptest.NewRecorder()
		l.ServeHTTP(w, httptest.NewRequest(method, "/", nil))
		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("welcome accepted %s: %d", method, w.Code)
		}
	}
	for _, path := range []string{"/.agenttm/config.json", "/workspaces", "/unlisted.css"} {
		w := httptest.NewRecorder()
		l.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		if w.Code != http.StatusNotFound {
			t.Errorf("welcome exposed unlisted path %s", path)
		}
	}
}

func TestLauncherConcurrentHandlerSwitches(t *testing.T) {
	l := &Launcher{}
	var workers sync.WaitGroup
	for i := 0; i < 16; i++ {
		workers.Add(1)
		go func() {
			defer workers.Done()
			for n := 0; n < 20; n++ {
				l.Set(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusAccepted)
					_, _ = w.Write([]byte("dashboard"))
				}))
				w := httptest.NewRecorder()
				l.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
				if w.Code != http.StatusAccepted || strings.TrimSpace(w.Body.String()) != "dashboard" {
					t.Errorf("handler switch lost request: %d, %s", w.Code, w.Body.String())
				}
			}
		}()
	}
	workers.Wait()
}
