package server

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func postFork(f fixture, payload string, headers map[string]string) *httptest.ResponseRecorder {
	r := httptest.NewRequest("POST", "http://127.0.0.1:7331/api/checkpoints/"+f.final+"/fork", bytes.NewBufferString(payload))
	r.Header.Set("Origin", "http://127.0.0.1:7331")
	r.Header.Set("X-AgentTM-CSRF", f.app.csrfToken)
	r.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		r.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	f.app.ServeHTTP(w, r)
	return w
}
func TestForkConfirmationAndCSRF(t *testing.T) {
	f := setup(t)
	preview := request(f.app, "GET", "/api/checkpoints/"+f.final+"/fork?name=browser-fork", nil)
	if preview.Code != 200 || body(t, preview)["partial"] != true {
		t.Fatal(preview.Body.String())
	}
	plan := body(t, preview)
	for _, tc := range []struct {
		payload string
		headers map[string]string
		status  int
	}{
		{`{"name":"browser-fork","allow_partial":true,"confirmed":true}`, map[string]string{"X-AgentTM-CSRF": "wrong"}, 403},
		{`{"name":"browser-fork","allow_partial":true,"confirmed":true}`, map[string]string{"Origin": "https://attacker.example"}, 403},
		{`{"name":"browser-fork","confirmed":false}`, nil, 400},
		{`{"name":"browser-fork","destination":"C:/escape","confirmed":true}`, nil, 400},
		{`{"name":"browser-fork","confirmed":true}`, nil, 409},
		{`{"name":"browser-fork","confirmed":true}`, map[string]string{"Content-Type": "text/plain"}, 415},
		{`{"name":"` + strings.Repeat("x", 5000) + `","confirmed":true}`, nil, 413},
	} {
		w := postFork(f, tc.payload, tc.headers)
		if w.Code != tc.status {
			t.Fatalf("got %d want %d: %s", w.Code, tc.status, w.Body.String())
		}
	}
	if _, e := os.Stat(plan["worktree_path"].(string)); !os.IsNotExist(e) {
		t.Fatal("rejected requests created a destination")
	}
	w := postFork(f, `{"name":"browser-fork","allow_partial":true,"confirmed":true}`, nil)
	if w.Code != 201 {
		t.Fatal(w.Body.String())
	}
	var result struct {
		WorktreePath string `json:"worktree_path"`
		Status       string `json:"status"`
	}
	if e := json.Unmarshal(w.Body.Bytes(), &result); e != nil {
		t.Fatal(e)
	}
	if result.Status != "ready" {
		t.Fatal("fork not ready")
	}
	b, e := os.ReadFile(filepath.Join(result.WorktreePath, "hello.txt"))
	if e != nil || string(b) != "modified\n" {
		t.Fatal("wrong restore")
	}
	if _, e = os.Stat(filepath.Join(result.WorktreePath, ".env")); !os.IsNotExist(e) {
		t.Fatal("excluded secret restored")
	}
	if w = postFork(f, `{"name":"browser-fork","allow_partial":true,"confirmed":true}`, nil); w.Code != 409 {
		t.Fatal("existing fork not protected")
	}
}
