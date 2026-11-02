package fork

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"agenttm/internal/config"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func gitTest(t *testing.T, root string, args ...string) string {
	t.Helper()
	b, e := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput()
	if e != nil {
		t.Fatalf("git %v: %s %v", args, b, e)
	}
	return strings.TrimSpace(string(b))
}
func put(t *testing.T, root, p, text string) {
	t.Helper()
	full := filepath.Join(root, filepath.FromSlash(p))
	if e := os.MkdirAll(filepath.Dir(full), 0700); e != nil {
		t.Fatal(e)
	}
	if e := os.WriteFile(full, []byte(text), 0600); e != nil {
		t.Fatal(e)
	}
}
func setup(t *testing.T, committed bool) (Service, string, snapshot.Manifest) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "fork spaces 日本語")
	os.Mkdir(root, 0700)
	gitTest(t, root, "init")
	if e := project.Init(root); e != nil {
		t.Fatal(e)
	}
	if committed {
		put(t, root, "src/a.txt", "base\n")
		put(t, root, "removed.txt", "base only\n")
		gitTest(t, root, "add", "src/a.txt", "removed.txt")
		gitTest(t, root, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-m", "base")
	}
	put(t, root, "src/a.txt", "staged\n")
	gitTest(t, root, "add", "src/a.txt")
	put(t, root, "src/a.txt", "dirty baseline\n")
	put(t, root, "untracked.txt", "untracked contents\n")
	if committed {
		os.Remove(filepath.Join(root, "removed.txt"))
	}
	store, e := storage.Open(root)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { store.DB.Close() })
	id, e := store.Start()
	if e != nil {
		t.Fatal(e)
	}
	engine := &snapshot.Engine{Root: root, Store: store, Config: config.Default()}
	cp, e := engine.Capture(context.Background(), id, "baseline")
	if e != nil {
		t.Fatal(e)
	}
	return Service{engine}, id, cp.Manifest
}
func TestForkRestoresWithoutTouchingOriginal(t *testing.T) {
	s, _, m := setup(t, true)
	root := s.Engine.Root
	// Advance HEAD after the historical capture, keeping a dirty source file.
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
	// The restore must ignore dangerous ambient index and worktree overrides.
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
	// Read without ambient Git overrides for verification of the original refs.
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
func TestUnbornForkAndPartialPolicy(t *testing.T) {
	s, id, m := setup(t, false)
	result, e := s.Create(context.Background(), m.ID, "unborn", false)
	if e != nil {
		t.Fatal(e)
	}
	if result.BaseCommit != "" || len(result.Warnings) == 0 {
		t.Fatal("unborn base not explained")
	}
	b, e := os.ReadFile(filepath.Join(result.WorktreePath, "src", "a.txt"))
	if e != nil || string(b) != "dirty baseline\n" {
		t.Fatal("unborn restore failed")
	}
	put(t, s.Engine.Root, ".env", "PRIVATE=omitted\n")
	partial, e := s.Engine.Capture(context.Background(), id, "manual")
	if e != nil {
		t.Fatal(e)
	}
	if _, e = s.Create(context.Background(), partial.Manifest.ID, "partial", false); e == nil {
		t.Fatal("partial restore allowed implicitly")
	}
	result, e = s.Create(context.Background(), partial.Manifest.ID, "partial", true)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = os.Stat(filepath.Join(result.WorktreePath, ".env")); !os.IsNotExist(e) {
		t.Fatal("secret file materialized")
	}
}
func TestRejectedInputsAndMissingObjects(t *testing.T) {
	s, _, m := setup(t, true)
	for _, name := range []string{"../escape", "/absolute", "has space", "UPPER", "con", "-option", "a/b", ""} {
		if _, e := s.Preview(context.Background(), m.ID, name); e == nil {
			t.Errorf("accepted name %q", name)
		}
	}
	if _, e := s.Preview(context.Background(), storage.ID(), "valid"); e == nil {
		t.Fatal("foreign checkpoint accepted")
	}
	hash := strings.TrimPrefix(m.Files[0].ObjectID, "sha256:")
	os.Remove(filepath.Join(s.Engine.Root, ".agenttm", "objects", hash[:2], hash))
	if _, e := s.Create(context.Background(), m.ID, "damaged", false); e == nil {
		t.Fatal("missing object restore accepted")
	}
	if _, e := os.Stat(filepath.Join(s.Engine.Root, ".agenttm", "worktrees", "damaged")); !os.IsNotExist(e) {
		t.Fatal("destination created before validation")
	}
}
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
func TestRejectSymlinkDestination(t *testing.T) {
	s, _, m := setup(t, true)
	outside := t.TempDir()
	p := filepath.Join(s.Engine.Root, ".agenttm", "worktrees")
	if e := os.Symlink(outside, p); e != nil {
		t.Skip("symlinks unavailable:", e)
	}
	if _, e := s.Create(context.Background(), m.ID, "escape", false); e == nil {
		t.Fatal("symlink escape accepted")
	}
	files, e := os.ReadDir(outside)
	if e != nil || len(files) != 0 {
		t.Fatal("outside path modified")
	}
}
