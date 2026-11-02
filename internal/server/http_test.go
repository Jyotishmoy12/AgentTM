package server

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"agenttm/internal/config"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

type fixture struct {
	app                  *Server
	session, base, final string
}

func setup(t *testing.T) fixture {
	t.Helper()
	root := t.TempDir()
	if b, e := exec.Command("git", "init", root).CombinedOutput(); e != nil {
		t.Fatalf("%s %v", b, e)
	}
	if e := project.Init(root); e != nil {
		t.Fatal(e)
	}
	store, e := storage.Open(root)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { store.DB.Close() })
	session, e := store.Start()
	if e != nil {
		t.Fatal(e)
	}
	engine := &snapshot.Engine{Root: root, Store: store, Config: config.Default()}
	os.WriteFile(filepath.Join(root, "hello.txt"), []byte("original\n"), 0600)
	baseline, e := engine.Capture(context.Background(), session, "baseline")
	if e != nil {
		t.Fatal(e)
	}
	store.Append(session, "item.completed", "command_execution", "item_1", []byte(`{"item":{"type":"command_execution","command":"echo test","aggregated_output":"<script>alert(1)</script>"}}`))
	os.WriteFile(filepath.Join(root, "hello.txt"), []byte("modified\n"), 0600)
	os.WriteFile(filepath.Join(root, "binary.dat"), []byte{0, 1, 2}, 0600)
	os.WriteFile(filepath.Join(root, "big.txt"), bytes.Repeat([]byte("x"), (1<<20)+1), 0600)
	os.WriteFile(filepath.Join(root, ".env"), []byte("SECRET=do-not-show"), 0600)
	final, e := engine.Capture(context.Background(), session, "final")
	if e != nil {
		t.Fatal(e)
	}
	if e = store.Finish(session, "completed", 0); e != nil {
		t.Fatal(e)
	}
	return fixture{New(engine, "test", "127.0.0.1:7331"), session, baseline.Manifest.ID, final.Manifest.ID}
}
func request(app *Server, method, path string, headers map[string]string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, "http://127.0.0.1:7331"+path, nil)
	for k, v := range headers {
		if k == "Host" {
			r.Host = v
		} else {
			r.Header.Set(k, v)
		}
	}
	w := httptest.NewRecorder()
	app.ServeHTTP(w, r)
	return w
}
func body(t *testing.T, w *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var out map[string]any
	if e := json.Unmarshal(w.Body.Bytes(), &out); e != nil {
		t.Fatalf("invalid JSON %d: %s", w.Code, w.Body.String())
	}
	return out
}
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
	// Embedded entry and bundled JS must serve without exposing repository files.
	w = request(f.app, "GET", "/", nil)
	if w.Code != 200 || !strings.Contains(w.Body.String(), "AgentTM") {
		t.Fatalf("frontend missing: %s", w.Body.String())
	}
	if w = request(f.app, "GET", "/README.md", nil); w.Code != 404 {
		t.Fatal("repository file exposed")
	}
}
func TestAPIRejectsUnsafeRequests(t *testing.T) {
	f := setup(t)
	cp := "/api/checkpoints/" + f.final
	cases := []struct {
		method, path string
		headers      map[string]string
		status       int
	}{
		{"GET", "/api/health", map[string]string{"Host": "attacker.example:7331"}, 403},
		{"GET", "/api/sessions", map[string]string{"Origin": "https://attacker.example"}, 403},
		{"GET", "/api/sessions", map[string]string{"Sec-Fetch-Site": "cross-site"}, 403},
		{"POST", cp + "/fork", map[string]string{"Origin": "http://127.0.0.1:7331"}, 405},
		{"POST", cp + "/fork", map[string]string{"Origin": "https://attacker.example"}, 403},
		{"GET", cp + "/file?path=../.git/config", nil, 400},
		{"GET", cp + "/file?path=C%3A%2Fsecret", nil, 400},
		{"GET", cp + "/file?path=.agenttm/config.json", nil, 400},
		{"GET", cp + "/file?path=binary.dat", nil, 415},
		{"GET", cp + "/file?path=big.txt", nil, 413},
		{"GET", cp + "/file?path=.env", nil, 404},
		{"GET", cp + "/tree?limit=1001", nil, 400},
		{"GET", cp + "/tree?limit=0", nil, 400},
		{"GET", cp + "/diff?against=arbitrary", nil, 400},
		{"GET", cp + "/diff?cursor=-1", nil, 400},
		{"GET", "/api/checkpoints/not-a-uuid", nil, 400},
		{"GET", "/api/checkpoints/" + storage.ID(), nil, 404},
		{"GET", "/api/sessions/" + f.session + "/events?limit=201", nil, 400},
		{"GET", "/api/sessions/" + f.session + "/events?cursor=99999999999999999999", nil, 400},
		{"GET", "/api/sessions?limit=100000", nil, 400},
	}
	for _, tc := range cases {
		w := request(f.app, tc.method, tc.path, tc.headers)
		if w.Code != tc.status {
			t.Errorf("%s %s: got %d want %d: %s", tc.method, tc.path, w.Code, tc.status, w.Body.String())
		}
		if body(t, w)["error"] == nil {
			t.Fatal("unstructured error")
		}
	}
	// A different project in the same DB cannot be selected by browser IDs.
	p, s := storage.ID(), storage.ID()
	if _, e := f.app.Engine.Store.DB.Exec("INSERT INTO projects VALUES (?,?,?)", p, "other-project", storage.Now()); e != nil {
		t.Fatal(e)
	}
	if _, e := f.app.Engine.Store.DB.Exec("INSERT INTO sessions(id,project_id,agent,started_at) VALUES (?,?,'codex',?)", s, p, storage.Now()); e != nil {
		t.Fatal(e)
	}
	if w := request(f.app, "GET", "/api/sessions/"+s+"/events", nil); w.Code != 404 {
		t.Fatal("foreign project session exposed")
	}
}
func TestPaginationAndIntegrity(t *testing.T) {
	f := setup(t)
	cursor := 0
	count := 0
	for {
		w := request(f.app, "GET", "/api/sessions/"+f.session+"/events?limit=1&cursor="+strconv.Itoa(cursor), nil)
		if w.Code != 200 {
			t.Fatal(w.Body.String())
		}
		v := body(t, w)
		items := v["items"].([]any)
		count += len(items)
		if v["next_cursor"] == nil {
			break
		}
		next := int(v["next_cursor"].(float64))
		if next <= cursor {
			t.Fatal("cursor did not advance")
		}
		cursor = next
	}
	if count != 3 {
		t.Fatalf("events duplicated/lost: %d", count)
	}
	first := body(t, request(f.app, "GET", "/api/sessions/"+f.session+"/checkpoints?limit=1", nil))
	next := int(first["next_cursor"].(float64))
	second := body(t, request(f.app, "GET", "/api/sessions/"+f.session+"/checkpoints?limit=1&cursor="+strconv.Itoa(next), nil))
	if second["next_cursor"] != nil || second["items"].([]any)[0].(map[string]any)["id"] != f.final {
		t.Fatal("checkpoint paging failed")
	}
	diff := body(t, request(f.app, "GET", "/api/checkpoints/"+f.final+"/diff?limit=1", nil))
	if diff["total"] != float64(3) || len(diff["items"].([]any)) != 1 || diff["next_cursor"] == nil {
		t.Fatal("diff page unbounded")
	}
	// Removing a referenced blob produces a recoverable API error, never live-file fallback.
	m, e := f.app.Engine.Load(f.base)
	if e != nil {
		t.Fatal(e)
	}
	hash := strings.TrimPrefix(m.Files[0].ObjectID, "sha256:")
	if e = os.Remove(filepath.Join(f.app.Engine.Root, ".agenttm", "objects", hash[:2], hash)); e != nil {
		t.Fatal(e)
	}
	w := request(f.app, "GET", "/api/checkpoints/"+f.base+"/file?path=hello.txt", nil)
	if w.Code != 500 || body(t, w)["error"].(map[string]any)["code"] != "object_unavailable" {
		t.Fatal("missing object not reported")
	}
}
