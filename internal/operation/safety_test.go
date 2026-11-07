package operation

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAcquireDoesNotCreateMissingStorageDirectories(t *testing.T) {
	root, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if release, err := Acquire(root, "recording"); err == nil || release != nil {
		t.Fatalf("missing storage accepted: %v", err)
	}
	if _, err := os.Stat(filepath.Join(root, ".agenttm")); !os.IsNotExist(err) {
		t.Fatalf("acquisition created history directory: %v", err)
	}
}

func TestAcquireNeverRemovesExistingStaleLock(t *testing.T) {
	root := lockRoot(t)
	path := filepath.Join(root, ".agenttm", "data", "maintenance.lock")
	const previous = "pid=0\n"
	if err := os.WriteFile(path, []byte(previous), 0600); err != nil {
		t.Fatal(err)
	}
	if release, err := Acquire(root, "maintenance"); err == nil || release != nil || !strings.Contains(err.Error(), "run agenttm doctor") {
		t.Fatalf("stale lock not refused with recovery guidance: %v", err)
	}
	data, err := os.ReadFile(path)
	if err != nil || string(data) != previous {
		t.Fatalf("stale lock altered: %q, %v", data, err)
	}
}

func TestAcquireRefusesSymlinkWithoutModifyingTarget(t *testing.T) {
	root := lockRoot(t)
	target := filepath.Join(t.TempDir(), "external-lock")
	if err := os.WriteFile(target, []byte("keep unchanged"), 0600); err != nil {
		t.Fatal(err)
	}
	link := filepath.Join(root, ".agenttm", "data", "snapshot.lock")
	if err := os.Symlink(target, link); err != nil {
		t.Skipf("symlinks unavailable: %v", err)
	}
	if release, err := Acquire(root, "snapshot"); err == nil || release != nil {
		t.Fatalf("symlink accepted: %v", err)
	}
	data, err := os.ReadFile(target)
	if err != nil || string(data) != "keep unchanged" {
		t.Fatalf("symlink target modified: %q, %v", data, err)
	}
}
