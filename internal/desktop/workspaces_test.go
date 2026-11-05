package desktop

import (
	"agenttm/internal/project"
	"agenttm/internal/storage"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRecordedWorkspaceFolderChecks(t *testing.T) {
	root := t.TempDir()
	if _, err := project.Git(root, "init"); err != nil {
		t.Fatal(err)
	}
	engine, err := Open(root, func(string) (bool, error) { return true, nil })
	if err != nil {
		t.Fatal(err)
	}
	defer engine.Store.DB.Close()
	root = engine.Root
	session, err := engine.Store.Start()
	if err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(filepath.Join(root, "keep.txt"), []byte("original workspace"), 0600); err != nil {
		t.Fatal(err)
	}
	captured, err := engine.Capture(context.Background(), session, "baseline")
	if err != nil {
		t.Fatal(err)
	}
	base := filepath.Join(root, ".agenttm", "worktrees")
	if err = os.MkdirAll(base, 0700); err != nil {
		t.Fatal(err)
	}
	add := func(path string) string {
		t.Helper()
		id := storage.ID()
		_, err := engine.Store.DB.Exec("INSERT INTO forks(id,checkpoint_id,worktree_path,branch_name,created_at,status) VALUES(?,?,?,?,?,'ready')", id, captured.Manifest.ID, path, "agenttm/test", storage.Now())
		if err != nil {
			t.Fatal(err)
		}
		return id
	}
	check := func(id, state string) FolderState {
		t.Helper()
		result, err := CheckRestoredFolder(engine.Store, root, id)
		if err != nil || result.State != state {
			t.Fatalf("state %q want %q, err %v", result.State, state, err)
		}
		if result.CheckedAt == "" {
			t.Fatal("check timestamp missing")
		}
		return result
	}
	before, err := project.Git(root, "status", "--porcelain")
	if err != nil {
		t.Fatal(err)
	}
	available := filepath.Join(base, "available")
	if err = os.Mkdir(available, 0700); err != nil {
		t.Fatal(err)
	}
	id := add(available)
	result := check(id, "available")
	if result.Path != available || !strings.Contains(result.Message, "not re-verified") {
		t.Fatal("folder check implied integrity verification")
	}
	// A saved ready record does not prove that the directory still exists.
	check(add(filepath.Join(base, "removed")), "missing")
	ordinaryFile := filepath.Join(base, "file")
	if err = os.WriteFile(ordinaryFile, []byte("not a directory"), 0600); err != nil {
		t.Fatal(err)
	}
	check(add(ordinaryFile), "inaccessible")
	check(add(filepath.Join(root, "outside")), "blocked")
	check(add(filepath.Join(base, "nested", "child")), "blocked")
	if _, err = CheckRestoredFolder(engine.Store, root, "not-an-id"); err == nil {
		t.Fatal("invalid ID accepted")
	}
	if _, err = CheckRestoredFolder(engine.Store, root, storage.ID()); err == nil {
		t.Fatal("unknown ID accepted")
	}
	foreignID := storage.ID()
	if _, err = engine.Store.DB.Exec("INSERT INTO projects(id,root_path,created_at) VALUES(?,?,?)", foreignID, filepath.Join(root, "other-project"), storage.Now()); err != nil {
		t.Fatal(err)
	}
	foreign := *engine.Store
	foreign.ProjectID = foreignID
	if _, err = CheckRestoredFolder(&foreign, root, id); err == nil {
		t.Fatal("another project's restore was exposed")
	}
	after, err := project.Git(root, "status", "--porcelain")
	if err != nil || after != before {
		t.Fatalf("folder checks changed the original workspace: %v", err)
	}
	t.Run("symlink", func(t *testing.T) {
		link := filepath.Join(base, "link")
		if err := os.Symlink(available, link); err != nil {
			t.Skipf("symlinks unavailable: %v", err)
		}
		check(add(link), "blocked")
	})
}
