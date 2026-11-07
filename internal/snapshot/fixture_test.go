package snapshot

import (
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"agenttm/internal/config"
	"agenttm/internal/project"
	"agenttm/internal/storage"
)

func git(t *testing.T, root string, args ...string) []byte {
	t.Helper()
	cmd := exec.Command("git", append([]string{"-C", root}, args...)...)
	b, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %v: %s %v", args, b, err)
	}
	return b
}

func write(t *testing.T, root, p string, b []byte) {
	t.Helper()
	full := filepath.Join(root, filepath.FromSlash(p))
	if err := os.MkdirAll(filepath.Dir(full), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(full, b, 0600); err != nil {
		t.Fatal(err)
	}
}

func setup(t *testing.T) (*Engine, string) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "project spaces 日本語")
	if err := os.MkdirAll(root, 0700); err != nil {
		t.Fatal(err)
	}
	git(t, root, "init")
	if err := project.Init(root); err != nil {
		t.Fatal(err)
	}
	s, err := storage.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.DB.Close() })
	id, err := s.Start()
	if err != nil {
		t.Fatal(err)
	}
	return &Engine{Root: root, Store: s, Config: config.Default()}, id
}

func capture(t *testing.T, e *Engine, id, kind string) CaptureResult {
	t.Helper()
	r, err := e.Capture(context.Background(), id, kind)
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func find(t *testing.T, m Manifest, p string) File {
	t.Helper()
	for _, f := range m.Files {
		if f.Path == p {
			return f
		}
	}
	t.Fatalf("missing %s", p)
	return File{}
}

func mustJSON(t *testing.T, v any) []byte {
	t.Helper()
	b, e := json.Marshal(v)
	if e != nil {
		t.Fatal(e)
	}
	return b
}
