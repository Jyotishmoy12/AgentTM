package desktop

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"agenttm/internal/project"
)

func TestInitializationErrorDoesNotWriteHistory(t *testing.T) {
	root := t.TempDir()
	if _, err := project.Git(root, "init"); err != nil {
		t.Fatal(err)
	}
	consentErr := errors.New("synthetic dialog failure")
	engine, err := Open(root, func(string) (bool, error) { return true, consentErr })
	if engine != nil || !errors.Is(err, consentErr) {
		t.Fatalf("consent failure was not preserved: %v", err)
	}
	if _, err := os.Stat(filepath.Join(root, ".agenttm")); !os.IsNotExist(err) {
		t.Fatal("failed confirmation initialized history")
	}
}

func TestRepositoryDiagnosticsRejectSubdirectoryAndIgnoreOverrides(t *testing.T) {
	root := t.TempDir()
	if _, err := project.Git(root, "init"); err != nil {
		t.Fatal(err)
	}
	subdirectory := filepath.Join(root, "nested")
	if err := os.Mkdir(subdirectory, 0700); err != nil {
		t.Fatal(err)
	}
	if state := CheckGitEnvironment(context.Background(), subdirectory); state.RepositoryState != "changed" {
		t.Fatalf("repository root mismatch was hidden: %+v", state)
	}
	t.Setenv("GIT_DIR", filepath.Join(t.TempDir(), "invalid.git"))
	t.Setenv("GIT_WORK_TREE", t.TempDir())
	if state := CheckGitEnvironment(context.Background(), root); state.RepositoryState != "valid" {
		t.Fatalf("ambient Git overrides redirected diagnostics: %+v", state)
	}
}

func TestWorkspaceStatusDoesNotSerializeFilesystemPath(t *testing.T) {
	data, err := json.Marshal(FolderState{State: "available", CheckedAt: "now", Message: "folder only", Path: "private path"})
	if err != nil {
		t.Fatal(err)
	}
	var fields map[string]string
	if err = json.Unmarshal(data, &fields); err != nil || len(fields) != 3 || fields["state"] != "available" || fields["checked_at"] != "now" || fields["message"] != "folder only" {
		t.Fatalf("workspace status bridge contract changed: %s, %v", data, err)
	}
}
