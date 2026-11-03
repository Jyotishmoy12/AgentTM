package server

import (
	"strconv"
	"testing"

	"agenttm/internal/storage"
)

func TestRestoredWorkspacesScopeAndPagination(t *testing.T) {
	f := setup(t)
	db := f.app.Engine.Store.DB
	for i := 0; i < 101; i++ {
		if _, err := db.Exec("INSERT INTO forks(id,checkpoint_id,worktree_path,branch_name,created_at,status) VALUES (?,?,?,?,?,'ready')", storage.ID(), f.final, "recorded/path/"+strconv.Itoa(i), "agenttm/test-"+strconv.Itoa(i), storage.Now()); err != nil {
			t.Fatal(err)
		}
	}
	otherProject, otherSession, otherCheckpoint := storage.ID(), storage.ID(), storage.ID()
	for _, q := range []struct {
		sql  string
		args []any
	}{
		{"INSERT INTO projects VALUES (?,?,?)", []any{otherProject, "another-project", storage.Now()}},
		{"INSERT INTO sessions(id,project_id,agent,started_at) VALUES (?,?,'codex',?)", []any{otherSession, otherProject, storage.Now()}},
		{"INSERT INTO checkpoints(id,session_id,manifest_path,created_at) VALUES (?,?,?,?)", []any{otherCheckpoint, otherSession, "not-read-by-ledger", storage.Now()}},
		{"INSERT INTO forks(id,checkpoint_id,worktree_path,branch_name,created_at,status) VALUES (?,?,?,?,?,'failed')", []any{storage.ID(), otherCheckpoint, "private-other-project", "agenttm/private", storage.Now()}},
	} {
		if _, err := db.Exec(q.sql, q.args...); err != nil {
			t.Fatal(err)
		}
	}
	first := request(f.app, "GET", "/api/forks", nil)
	if first.Code != 200 {
		t.Fatal(first.Body.String())
	}
	page := body(t, first)
	items := page["items"].([]any)
	if len(items) != 100 {
		t.Fatalf("page length %d", len(items))
	}
	cursor := int(page["next_cursor"].(float64))
	second := body(t, request(f.app, "GET", "/api/forks?cursor="+strconv.Itoa(cursor), nil))
	remaining := second["items"].([]any)
	if len(remaining) != 1 || second["next_cursor"] != nil {
		t.Fatalf("bad final page: %+v", second)
	}
	if remaining[0].(map[string]any)["worktree_path"] != "recorded/path/100" {
		t.Fatal("wrong project or ordering")
	}
	if request(f.app, "GET", "/api/forks?cursor=-1", nil).Code != 400 {
		t.Fatal("negative cursor accepted")
	}
	if request(f.app, "GET", "/api/forks", map[string]string{"Origin": "https://other.example"}).Code != 403 {
		t.Fatal("cross-origin read allowed")
	}
}
