package project

import (
	"os"
	"path/filepath"
	"testing"
)

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

func TestInitRefusesSymlinkExcludeWithoutChangingTarget(t *testing.T) {
	root := t.TempDir()
	gitTest(t, root, "init")
	exclude := filepath.Join(root, ".git", "info", "exclude")
	outside := filepath.Join(t.TempDir(), "external-exclude")
	if err := os.WriteFile(outside, []byte("preserve external rules"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.Remove(exclude); err != nil && !os.IsNotExist(err) {
		t.Fatal(err)
	}
	if err := os.Symlink(outside, exclude); err != nil {
		t.Skipf("symlinks unavailable: %v", err)
	}
	if err := Init(root); err == nil {
		t.Fatal("symlinked Git exclude accepted")
	}
	data, err := os.ReadFile(outside)
	if err != nil || string(data) != "preserve external rules" {
		t.Fatalf("external exclude modified: %q, %v", data, err)
	}
}
