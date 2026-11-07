package fork

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"testing"

	"agenttm/internal/snapshot"
)

func TestForkRestoresWithoutTouchingOriginal(t *testing.T) {
	s, _, m := setup(t, true)
	root := s.Engine.Root
	put(t, root, "future.txt", "not in checkpoint\n")
	gitTest(t, root, "add", "future.txt")
	gitTest(t, root, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-m", "future")
	head := gitTest(t, root, "rev-parse", "HEAD")
	index, _ := os.ReadFile(filepath.Join(root, ".git", "index"))
	source, _ := os.ReadFile(filepath.Join(root, "src", "a.txt"))
	hooks := t.TempDir()
	marker := filepath.ToSlash(filepath.Join(root, "hook-fired"))
	for _, hook := range []string{"post-checkout", "reference-transaction"} {
		put(t, hooks, hook, "#!/bin/sh\nprintf executed > '"+marker+"'\n")
		os.Chmod(filepath.Join(hooks, hook), 0700)
	}
	gitTest(t, root, "config", "core.hooksPath", hooks)
	t.Setenv("GIT_INDEX_FILE", filepath.Join(root, ".git", "index"))
	t.Setenv("GIT_WORK_TREE", root)
	result, e := s.Create(context.Background(), m.ID, "alternative", false)
	if e != nil {
		t.Fatal(e)
	}
	if result.Status != "ready" || result.BaseCommit != m.BaseCommit {
		t.Fatalf("bad result %+v", result)
	}
	if actual := gitTest(t, result.WorktreePath, "rev-parse", "HEAD"); actual != m.BaseCommit {
		t.Fatal("fork did not use historical base")
	}
	for _, f := range m.Files {
		b, e := os.ReadFile(filepath.Join(result.WorktreePath, filepath.FromSlash(f.Path)))
		if e != nil || "sha256:"+snapshot.Hash(b) != f.ObjectID {
			t.Fatalf("restored %s %v", f.Path, e)
		}
	}
	for _, p := range []string{"future.txt", "removed.txt", "hook-fired"} {
		if _, e := os.Lstat(filepath.Join(result.WorktreePath, p)); !os.IsNotExist(e) {
			t.Fatalf("unexpected fork file %s", p)
		}
	}
	if _, e := os.Stat(filepath.Join(root, "hook-fired")); !os.IsNotExist(e) {
		t.Fatal("Git hook was executed")
	}
	if e = os.Unsetenv("GIT_INDEX_FILE"); e != nil {
		t.Fatal(e)
	}
	if e = os.Unsetenv("GIT_WORK_TREE"); e != nil {
		t.Fatal(e)
	}
	if current := gitTest(t, root, "rev-parse", "HEAD"); current != head {
		t.Fatal("original HEAD changed")
	}
	after, _ := os.ReadFile(filepath.Join(root, ".git", "index"))
	if !bytes.Equal(index, after) {
		t.Fatal("original index changed")
	}
	after, _ = os.ReadFile(filepath.Join(root, "src", "a.txt"))
	if !bytes.Equal(source, after) {
		t.Fatal("original working file changed")
	}
	if _, e = s.Create(context.Background(), m.ID, "alternative", false); e == nil {
		t.Fatal("existing destination was overwritten")
	}
}
