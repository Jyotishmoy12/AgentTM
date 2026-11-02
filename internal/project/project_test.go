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
