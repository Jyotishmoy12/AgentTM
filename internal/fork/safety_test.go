package fork

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPreviewRejectsCaseInsensitiveBranchCollision(t *testing.T) {
	s, _, m := setup(t, true)
	gitTest(t, s.Engine.Root, "branch", "agenttm/Existing")
	if _, err := s.Preview(context.Background(), m.ID, "existing"); !IsConflict(err) {
		t.Fatalf("expected branch conflict, got %v", err)
	}
}

func TestRestoreRefusesPopulatedDisabledHooksDirectory(t *testing.T) {
	s, _, m := setup(t, true)
	put(t, s.Engine.Root, ".agenttm/disabled-hooks/post-checkout", "exit 1\n")
	if _, err := s.Create(context.Background(), m.ID, "unsafe-hooks", false); err == nil || !strings.Contains(err.Error(), "must remain empty") {
		t.Fatalf("expected hook safety failure, got %v", err)
	}
	if _, err := os.Stat(filepath.Join(s.Engine.Root, ".agenttm", "worktrees", "unsafe-hooks")); !os.IsNotExist(err) {
		t.Fatalf("destination created before hook validation: %v", err)
	}
}

func TestMaterializeRejectsUnexpectedFiles(t *testing.T) {
	s, _, m := setup(t, true)
	dest, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	put(t, dest, "unexpected.txt", "must not be silently accepted\n")
	if err := s.materialize(context.Background(), dest, m); err == nil || !strings.Contains(err.Error(), "unexpected file") {
		t.Fatalf("expected inventory failure, got %v", err)
	}
	data, err := os.ReadFile(filepath.Join(dest, "unexpected.txt"))
	if err != nil || string(data) != "must not be silently accepted\n" {
		t.Fatalf("unexpected file was modified: %q, %v", data, err)
	}
}
