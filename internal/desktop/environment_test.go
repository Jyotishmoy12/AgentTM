package desktop

import (
	"agenttm/internal/project"
	"context"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestGitEnvironmentVerifiesExpectedRootWithoutChanges(t *testing.T) {
	root := t.TempDir()
	if _, err := project.Git(root, "init"); err != nil {
		t.Fatal(err)
	}
	before, err := project.Git(root, "status", "--porcelain")
	if err != nil {
		t.Fatal(err)
	}
	result := CheckGitEnvironment(context.Background(), root)
	if result.GitState != "available" || !strings.HasPrefix(result.GitVersion, "git version ") || result.RepositoryState != "valid" {
		t.Fatalf("unexpected diagnostics: %+v", result)
	}
	after, err := project.Git(root, "status", "--porcelain")
	if err != nil || before != after {
		t.Fatal("read-only diagnostics changed the project")
	}
	other := t.TempDir()
	t.Setenv("GIT_CEILING_DIRECTORIES", filepath.Dir(other))
	result = CheckGitEnvironment(context.Background(), other)
	if result.RepositoryState == "valid" {
		t.Fatal("unrelated/non-Git root reported verified")
	}
}
func TestGitEnvironmentMissingAndFailedChecksDoNotReportSuccess(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("Git is not installed")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	result := CheckGitEnvironment(ctx, t.TempDir())
	if result.GitState != "failed" || result.RepositoryState != "unchecked" {
		t.Fatalf("failed check reported success: %+v", result)
	}
	t.Setenv("PATH", t.TempDir())
	result = CheckGitEnvironment(context.Background(), t.TempDir())
	if result.GitState != "missing" || result.RepositoryState != "unchecked" || result.GitVersion != "" {
		t.Fatalf("missing Git reported success: %+v", result)
	}
}
