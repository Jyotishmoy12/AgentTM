package maintenance

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"agenttm/internal/config"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func historyFixture(t *testing.T) *snapshot.Engine {
	t.Helper()
	root := t.TempDir()
	if b, err := exec.Command("git", "init", root).CombinedOutput(); err != nil {
		t.Fatalf("%s: %v", b, err)
	}
	if err := project.Init(root); err != nil {
		t.Fatal(err)
	}
	s, err := storage.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.DB.Close() })
	return &snapshot.Engine{Root: root, Store: s, Config: config.Default()}
}

func captureFile(t *testing.T, e *snapshot.Engine, content string) (string, snapshot.Manifest) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(e.Root, "note.txt"), []byte(content), 0600); err != nil {
		t.Fatal(err)
	}
	id, err := e.Store.Start()
	if err != nil {
		t.Fatal(err)
	}
	cp, err := e.Capture(context.Background(), id, "baseline")
	if err != nil {
		t.Fatal(err)
	}
	if err = e.Store.Finish(id, "completed", 0); err != nil {
		t.Fatal(err)
	}
	return id, cp.Manifest
}
