package server

import (
	"agenttm/internal/storage"
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSessionNamesRequireCSRFAndPreserveHistory(t *testing.T) {
	f := setup(t)
	post := func(id, payload string, headers map[string]string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("POST", "http://127.0.0.1:7331/api/sessions/"+id+"/title", bytes.NewBufferString(payload))
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
	for _, tc := range []struct {
		payload string
		headers map[string]string
		code    int
	}{
		{`{"title":"name"}`, map[string]string{"X-AgentTM-CSRF": "wrong"}, 403},
		{`{"title":"name"}`, map[string]string{"Origin": "https://attacker.example"}, 403},
		{`{"title":"name"}`, map[string]string{"Content-Type": "text/plain"}, 415},
		{`{}`, nil, 400}, {`{"title":null}`, nil, 400}, {`{"title":"a","extra":true}`, nil, 400},
		{`{"title":"a"} {"title":"b"}`, nil, 400}, {`{"title":"first\nsecond"}`, nil, 400},
		{`{"title":"` + strings.Repeat("x", 121) + `"}`, nil, 400},
		{`{"title":"` + strings.Repeat("x", 3000) + `"}`, nil, 413},
	} {
		if w := post(f.session, tc.payload, tc.headers); w.Code != tc.code {
			t.Fatalf("got %d want %d: %s", w.Code, tc.code, w.Body.String())
		}
	}
	before, err := f.app.Engine.Store.Events(f.session, 0, 1000)
	if err != nil {
		t.Fatal(err)
	}
	if w := post(f.session, `{"title":"  Review authentication  "}`, nil); w.Code != 200 || body(t, w)["title"] != "Review authentication" {
		t.Fatal(w.Code, w.Body.String())
	}
	page := body(t, request(f.app, "GET", "/api/sessions", nil))
	items := page["items"].([]any)
	if items[0].(map[string]any)["title"] != "Review authentication" {
		t.Fatal(items)
	}
	after, _ := f.app.Engine.Store.Events(f.session, 0, 1000)
	a, _ := json.Marshal(before)
	b, _ := json.Marshal(after)
	if !bytes.Equal(a, b) {
		t.Fatal("renaming changed events")
	}
	if w := post(storage.ID(), `{"title":"missing"}`, nil); w.Code != 404 {
		t.Fatal(w.Code, w.Body.String())
	}
	otherProject, otherSession := storage.ID(), storage.ID()
	if _, err = f.app.Engine.Store.DB.Exec("INSERT INTO projects VALUES(?,?,?)", otherProject, "other", storage.Now()); err != nil {
		t.Fatal(err)
	}
	if _, err = f.app.Engine.Store.DB.Exec("INSERT INTO sessions(id,project_id,agent,started_at) VALUES(?,?,'codex',?)", otherSession, otherProject, storage.Now()); err != nil {
		t.Fatal(err)
	}
	if w := post(otherSession, `{"title":"must not write"}`, nil); w.Code != 404 {
		t.Fatal(w.Code, w.Body.String())
	}
	if w := post(f.session, `{"title":""}`, nil); w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
}
