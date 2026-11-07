package desktop

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestLauncherRoutesAndSwitch(t *testing.T) {
	l := &Launcher{}
	for _, path := range []string{"/", "/index.html", "/launcher.js"} {
		w := httptest.NewRecorder()
		l.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		if w.Code != 200 || !strings.Contains(w.Body.String(), "ChooseProject") && path == "/launcher.js" {
			t.Fatalf("welcome asset %s: %d", path, w.Code)
		}
	}
	w := httptest.NewRecorder()
	l.ServeHTTP(w, httptest.NewRequest("GET", "/api/sessions", nil))
	if w.Code != 404 {
		t.Fatal("project API served before selecting project")
	}
	l.Set(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(202) }))
	w = httptest.NewRecorder()
	l.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
	if w.Code != 202 {
		t.Fatal("dashboard handler not selected")
	}
}
