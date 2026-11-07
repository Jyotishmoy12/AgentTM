package server

import (
	"testing"

	"agenttm/internal/storage"
)

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
		{"POST", cp + "/fork", map[string]string{"Origin": "http://127.0.0.1:7331"}, 403},
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
