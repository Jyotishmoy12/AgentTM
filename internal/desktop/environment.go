package desktop

import (
	"context"
	"os/exec"
	"strings"

	"agenttm/internal/events"
	"agenttm/internal/process"
)

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
	result.RepositoryState = repositoryState(ctx, root)
	return result
}
