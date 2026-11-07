package codex

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"agenttm/internal/events"
	"agenttm/internal/process"
)

func Compatibility(version string) string {
	if strings.Contains(version, "0.164.0-alpha.11.1") {
		return "Observed JSONL integration version: 0.164.0-alpha.11.1"
	}
	return "CLI version has not been end-to-end verified by this build; JSON capability is advertised, but run a disposable real task to check schema compatibility."
}

func (a Adapter) Available(ctx context.Context) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	versionCommand := exec.CommandContext(ctx, a.binary(), "--version")
	process.HideWindow(versionCommand)
	b, e := versionCommand.Output()
	if e != nil {
		return "", fmt.Errorf("Codex unavailable: install Codex CLI and make codex available on PATH")
	}
	version := events.Redact(strings.TrimSpace(string(b)))
	helpCommand := exec.CommandContext(ctx, a.binary(), "exec", "--help")
	process.HideWindow(helpCommand)
	help, e := helpCommand.Output()
	if e != nil || !strings.Contains(string(help), "--json") {
		return version, fmt.Errorf("installed Codex does not advertise exec --json support; update Codex")
	}
	return version, nil
}
