package server

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
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
