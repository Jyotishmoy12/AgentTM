package desktop

import (
	"os"
	"path/filepath"
	"testing"

	"agenttm/internal/project"
)

func TestOpenProjectConsentAndExistingHistory(t *testing.T) {
	root := t.TempDir()
	if _, err := project.Git(root, "init"); err != nil {
		t.Fatal(err)
	}
	file := filepath.Join(root, "keep.txt")
	if err := os.WriteFile(file, []byte("unchanged"), 0600); err != nil {
		t.Fatal(err)
	}
	before, err := project.Git(root, "status", "--porcelain")
	if err != nil {
		t.Fatal(err)
	}
	if engine, err := Open(root, nil); err == nil || engine != nil {
		t.Fatal("implicit initialization allowed")
	}
	if engine, err := Open(root, func(string) (bool, error) { return false, nil }); err != nil || engine != nil {
		t.Fatalf("cancel: %v", err)
	}
	if _, err := os.Stat(filepath.Join(root, ".agenttm")); !os.IsNotExist(err) {
		t.Fatal("cancel wrote history")
	}
	engine, err := Open(root, func(string) (bool, error) { return true, nil })
	if err != nil {
		t.Fatal(err)
	}
	engine.Store.DB.Close()
	after, err := project.Git(root, "status", "--porcelain")
	if err != nil || before != after {
		t.Fatalf("initialization changed project status: %q -> %q (%v)", before, after, err)
	}
	engine, err = Open(root, func(string) (bool, error) { t.Fatal("existing history requested initialization"); return false, nil })
	if err != nil {
		t.Fatal(err)
	}
	engine.Store.DB.Close()
	cp := filepath.Join(root, ".agenttm", "config.json")
	if err := os.WriteFile(cp, []byte("invalid configuration"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := Open(root, func(string) (bool, error) { t.Fatal("corrupt history requested initialization"); return true, nil }); err == nil {
		t.Fatal("corrupt config accepted")
	}
	data, _ := os.ReadFile(cp)
	if string(data) != "invalid configuration" {
		t.Fatal("existing config overwritten")
	}
}

func TestOpenRejectsInvalidRepository(t *testing.T) {
	root := t.TempDir()
	t.Setenv("GIT_CEILING_DIRECTORIES", filepath.Dir(root))
	if engine, err := Open(root, func(string) (bool, error) { t.Fatal("invalid project requested initialization"); return true, nil }); err == nil || engine != nil {
		t.Fatal("non-Git directory accepted")
	}
}
