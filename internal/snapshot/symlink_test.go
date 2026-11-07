package snapshot

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSymlinkAndSubmoduleOmission(t *testing.T) {
	e, id := setup(t)
	outside := t.TempDir()
	write(t, outside, "secret", []byte("must never capture"))
	if err := os.Symlink(outside, filepath.Join(e.Root, "escape")); err != nil {
		t.Skip("symlinks unavailable:", err)
	}
	m := capture(t, e, id, "baseline").Manifest
	if !m.Partial || len(m.Files) != 0 || len(m.Omissions) != 1 {
		t.Fatalf("symlink traversal: %+v", m)
	}
	store := filepath.Join(e.Root, ".agenttm", "objects")
	if err := os.Symlink(outside, filepath.Join(store, "aa")); err != nil {
		t.Fatal(err)
	}
	if len(e.Doctor().Problems) == 0 {
		t.Fatal("store symlink missed")
	}
}
