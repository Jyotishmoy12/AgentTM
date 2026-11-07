package fork

import (
	"context"
	"os"
	"testing"
)

func TestFailureRetainsDiagnosableWorktree(t *testing.T) {
	s, _, m := setup(t, true)
	if _, e := s.Engine.Store.DB.Exec("CREATE TRIGGER fail_fork_ready BEFORE UPDATE OF status ON forks WHEN NEW.status='ready' BEGIN SELECT RAISE(ABORT,'synthetic persistence failure'); END"); e != nil {
		t.Fatal(e)
	}
	result, e := s.Create(context.Background(), m.ID, "retained", false)
	if e == nil {
		t.Fatal("persistence failure ignored")
	}
	if _, e = os.Stat(result.WorktreePath); e != nil {
		t.Fatal("failed worktree not retained")
	}
	var status string
	if e = s.Engine.Store.DB.QueryRow("SELECT status FROM forks WHERE id=?", result.ID).Scan(&status); e != nil || status != "failed" {
		t.Fatalf("failure not recorded: %s %v", status, e)
	}
}
