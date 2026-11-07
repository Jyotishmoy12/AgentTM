package fork

import (
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
