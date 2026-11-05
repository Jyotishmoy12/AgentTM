package desktop

import (
	"agenttm/internal/events"
	"agenttm/internal/process"
	"agenttm/internal/project"
	"context"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

type GitEnvironment struct {
	GitState        string `json:"git_state"`
	GitVersion      string `json:"git_version"`
	RepositoryState string `json:"repository_state"`
}

// CheckGitEnvironment performs read-only version and repository-discovery checks.
// It does not run status hooks, change Git configuration, or test restore behavior.
func CheckGitEnvironment(ctx context.Context, root string) GitEnvironment {
	result := GitEnvironment{GitState: "missing", RepositoryState: "unchecked"}
	if _, err := exec.LookPath("git"); err != nil {
		return result
	}
	command := exec.CommandContext(ctx, "git", "--version")
	process.HideWindow(command)
	output, err := command.Output()
	version := events.Redact(strings.TrimSpace(string(output)))
	if err != nil || !strings.HasPrefix(version, "git version ") || len(version) > 160 {
		result.GitState = "failed"
		return result
	}
	result.GitState = "available"
	result.GitVersion = version
	output, err = project.Command(ctx, root, "rev-parse", "--show-toplevel").Output()
	if err != nil {
		result.RepositoryState = "invalid"
		return result
	}
	discovered, err := filepath.EvalSymlinks(strings.TrimSpace(string(output)))
	if err != nil {
		result.RepositoryState = "invalid"
		return result
	}
	expected, err := filepath.EvalSymlinks(root)
	if err != nil {
		result.RepositoryState = "invalid"
		return result
	}
	discovered, err = filepath.Abs(discovered)
	if err != nil {
		result.RepositoryState = "invalid"
		return result
	}
	expected, err = filepath.Abs(expected)
	if err != nil {
		result.RepositoryState = "invalid"
		return result
	}
	same := discovered == expected
	if runtime.GOOS == "windows" {
		same = strings.EqualFold(discovered, expected)
	}
	if !same {
		result.RepositoryState = "changed"
		return result
	}
	result.RepositoryState = "valid"
	return result
}
