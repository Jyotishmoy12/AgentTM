package project

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestCommandStripsGitOverridesButRetainsCeiling(t *testing.T) {
	root := t.TempDir()
	for key, value := range map[string]string{
		"GIT_DIR": "unrelated-repository", "GIT_WORK_TREE": "unrelated-worktree",
		"GIT_INDEX_FILE": "unrelated-index", "GIT_CONFIG_COUNT": "1",
		"GIT_CONFIG_KEY_0": "core.hooksPath", "GIT_CONFIG_VALUE_0": "untrusted-hooks",
		"GIT_OPTIONAL_LOCKS": "1", "GIT_CEILING_DIRECTORIES": root,
		"AGENTTM_PROJECT_TEST_VALUE": "retained",
	} {
		t.Setenv(key, value)
	}
	cmd := Command(context.Background(), root, "status", "--porcelain")
	gitKeys := map[string]string{}
	optionalLocks := 0
	unrelated := false
	for _, entry := range cmd.Env {
		key, value, _ := strings.Cut(entry, "=")
		key = strings.ToUpper(key)
		if strings.HasPrefix(key, "GIT_") {
			gitKeys[key] = value
		}
		if key == "GIT_OPTIONAL_LOCKS" {
			optionalLocks++
		}
		if key == "AGENTTM_PROJECT_TEST_VALUE" && value == "retained" {
			unrelated = true
		}
	}
	if len(gitKeys) != 2 || gitKeys["GIT_CEILING_DIRECTORIES"] != root || gitKeys["GIT_OPTIONAL_LOCKS"] != "0" || optionalLocks != 1 || !unrelated {
		t.Fatal("Git override isolation or retained environment changed")
	}
}

func TestRootIgnoresAmbientRepositoryAndIndexOverrides(t *testing.T) {
	root, other := t.TempDir(), t.TempDir()
	gitTest(t, root, "init")
	gitTest(t, other, "init")
	index := filepath.Join(t.TempDir(), "external-index")
	if err := os.WriteFile(index, []byte("preserve external index"), 0600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("GIT_DIR", filepath.Join(other, ".git"))
	t.Setenv("GIT_WORK_TREE", other)
	t.Setenv("GIT_INDEX_FILE", index)
	got, err := Root(root)
	canonical, canonicalErr := filepath.EvalSymlinks(root)
	if err != nil || canonicalErr != nil || got != canonical {
		t.Fatalf("ambient overrides redirected discovery: %s, %v, %v", got, err, canonicalErr)
	}
	data, err := os.ReadFile(index)
	if err != nil || string(data) != "preserve external index" {
		t.Fatalf("ambient index modified: %v", err)
	}
}

func TestGitErrorsRemainWrappedAndCommandHonorsCancellation(t *testing.T) {
	root := t.TempDir()
	gitTest(t, root, "init")
	_, err := Git(root, "rev-parse", "--verify", "refs/heads/missing")
	var exitError *exec.ExitError
	if !errors.As(err, &exitError) || !strings.Contains(err.Error(), "git rev-parse --verify refs/heads/missing failed") {
		t.Fatalf("Git error lost cause or context: %v", err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := Command(ctx, root, "status").Output(); !errors.Is(err, context.Canceled) {
		t.Fatalf("cancelled command executed: %v", err)
	}
}
