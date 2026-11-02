package project

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func gitTest(t *testing.T, dir string, args ...string) []byte {
	t.Helper()
	b, e := exec.Command("git", append([]string{"-C", dir}, args...)...).CombinedOutput()
	if e != nil {
		t.Fatalf("git: %s %v", b, e)
	}
	return b
}
func TestInitSafety(t *testing.T) {
	root := filepath.Join(t.TempDir(), "project spaces 日本語")
	t.Setenv("GIT_CEILING_DIRECTORIES", filepath.Dir(root))
	os.MkdirAll(root, 0700)
	if _, e := Root(root); e == nil {
		t.Fatal("non-Git accepted")
	}
	gitTest(t, root, "init")
	os.WriteFile(filepath.Join(root, "tracked.txt"), []byte("staged"), 0600)
	gitTest(t, root, "add", "tracked.txt")
	os.WriteFile(filepath.Join(root, "tracked.txt"), []byte("dirty"), 0600)
	index, _ := os.ReadFile(filepath.Join(root, ".git", "index"))
	head, _ := os.ReadFile(filepath.Join(root, ".git", "HEAD"))
	for i := 0; i < 2; i++ {
		if e := Init(root); e != nil {
			t.Fatal(e)
		}
	}
	after, _ := os.ReadFile(filepath.Join(root, ".git", "index"))
	if !bytes.Equal(index, after) {
		t.Fatal("index changed")
	}
	after, _ = os.ReadFile(filepath.Join(root, ".git", "HEAD"))
	if !bytes.Equal(head, after) {
		t.Fatal("HEAD changed")
	}
	after, _ = os.ReadFile(filepath.Join(root, "tracked.txt"))
	if string(after) != "dirty" {
		t.Fatal("working file changed")
	}
	exclude, _ := os.ReadFile(filepath.Join(root, ".git", "info", "exclude"))
	if bytes.Count(exclude, []byte("/.agenttm/")) != 1 {
		t.Fatal("exclude not idempotent")
	}
	nested := filepath.Join(root, "nested")
	os.Mkdir(nested, 0700)
	got, e := Root(nested)
	canonical, _ := filepath.EvalSymlinks(root)
	if e != nil || got != canonical {
		t.Fatalf("root %s %v", got, e)
	}
	if _, e = os.Stat(filepath.Join(root, ".gitignore")); !os.IsNotExist(e) {
		t.Fatal("created tracked ignore file")
	}
}
func TestRejectStorageSymlink(t *testing.T) {
	root := t.TempDir()
	outside := t.TempDir()
	if e := os.Symlink(outside, filepath.Join(root, ".agenttm")); e != nil {
		t.Skip("symlinks unavailable:", e)
	}
	if e := Init(root); e == nil {
		t.Fatal("storage symlink accepted")
	}
}

func TestStorageAllowsRepositoryAncestorAlias(t *testing.T) {
	parent := t.TempDir()
	real := filepath.Join(parent, "physical")
	if err := os.Mkdir(real, 0700); err != nil {
		t.Fatal(err)
	}
	alias := filepath.Join(parent, "alias")
	if err := os.Symlink(real, alias); err != nil {
		t.Skip("symlinks unavailable:", err)
	}
	root := filepath.Join(alias, "repo")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	gitTest(t, root, "init")
	if err := Init(root); err != nil {
		t.Fatalf("legitimate ancestor alias rejected: %v", err)
	}
	if err := SafePath(filepath.Join(root, ".agenttm", "objects", "new-object")); err != nil {
		t.Fatal(err)
	}
	outside := t.TempDir()
	if err := os.Symlink(outside, filepath.Join(root, ".agenttm", "objects", "escape")); err != nil {
		t.Fatal(err)
	}
	if err := SafePath(filepath.Join(root, ".agenttm", "objects", "escape", "blob")); err == nil {
		t.Fatal("storage symlink beneath an aliased repository was accepted")
	}
}
