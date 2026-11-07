package cli

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"testing"

	"agenttm/internal/project"
)

func installCLIChild(t *testing.T) {
	t.Helper()
	fakeDir := t.TempDir()
	binary, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	name := "codex"
	if filepath.Ext(binary) == ".exe" {
		name += ".exe"
	}
	fake := filepath.Join(fakeDir, name)
	b, err := os.ReadFile(binary)
	if err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(fake, b, 0700); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", fakeDir+string(os.PathListSeparator)+os.Getenv("PATH"))
	t.Setenv("AGENTTM_CLI_TEST_CHILD", "1")
}

func initializeCLIProject(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	if _, err := project.Git(root, "init"); err != nil {
		t.Fatal(err)
	}
	t.Chdir(root)
	var out, diagnostic bytes.Buffer
	if code := Run(context.Background(), []string{"init"}, &out, &diagnostic); code != 0 {
		t.Fatal(diagnostic.String())
	}
	return root
}
