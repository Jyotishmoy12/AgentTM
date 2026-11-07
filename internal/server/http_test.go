package server

import (
	"strings"
	"testing"
)

func TestReadOnlyAPI(t *testing.T) {
	f := setup(t)
	for _, path := range []string{"/api/health", "/api/sessions", "/api/sessions/" + f.session + "/events", "/api/sessions/" + f.session + "/checkpoints", "/api/checkpoints/" + f.final, "/api/checkpoints/" + f.final + "/tree", "/api/checkpoints/" + f.final + "/diff?against=parent"} {
		w := request(f.app, "GET", path, nil)
		if w.Code != 200 {
			t.Fatalf("%s: %d %s", path, w.Code, w.Body.String())
		}
		body(t, w)
		if w.Header().Get("Access-Control-Allow-Origin") != "" || w.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("unsafe response headers")
		}
	}
	w := request(f.app, "GET", "/api/checkpoints/"+f.base+"/file?path=hello.txt", nil)
	if w.Code != 200 || body(t, w)["content"] != "original\n" {
		t.Fatalf("wrong historical data %s", w.Body.String())
	}
	w = request(f.app, "GET", "/api/checkpoints/"+f.final, nil)
	m := body(t, w)
	if m["partial"] != true || m["omission_count"] != float64(1) || strings.Contains(w.Body.String(), "do-not-show") {
		t.Fatalf("omission/privacy %s", w.Body.String())
	}
	w = request(f.app, "GET", "/api/sessions/"+f.session+"/events", nil)
	if strings.Contains(w.Body.String(), "<script>") {
		t.Fatal("JSON HTML escaping disabled")
	}

	w = request(f.app, "GET", "/", nil)
	if w.Code != 200 || !strings.Contains(w.Body.String(), "AgentTM") {
		t.Fatalf("frontend missing: %s", w.Body.String())
	}
	if w = request(f.app, "GET", "/README.md", nil); w.Code != 404 {
		t.Fatal("repository file exposed")
	}
}
