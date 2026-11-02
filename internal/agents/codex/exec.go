package codex

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"strings"
	"time"

	"agenttm/internal/agents"
	"agenttm/internal/events"
	"agenttm/internal/process"
)

type Adapter struct {
	Executable, Model string
	Sandbox           string
	MaxPayload        int
	OmitTask          string
}

func (a Adapter) Name() string { return "codex" }
func Compatibility(version string) string {
	if strings.Contains(version, "0.164.0-alpha.11.1") {
		return "Observed JSONL integration version: 0.164.0-alpha.11.1"
	}
	return "CLI version has not been end-to-end verified by this build; JSON capability is advertised, but run a disposable real task to check schema compatibility."
}
func (a Adapter) binary() string {
	if a.Executable != "" {
		return a.Executable
	}
	return "codex"
}
func (a Adapter) Available(ctx context.Context) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	// Do not forward arbitrary diagnostic output: CLI configuration may contain secrets.
	b, e := exec.CommandContext(ctx, a.binary(), "--version").Output()
	if e != nil {
		return "", fmt.Errorf("Codex unavailable: install Codex CLI and make codex available on PATH")
	}
	version := events.Redact(strings.TrimSpace(string(b)))
	help, e := exec.CommandContext(ctx, a.binary(), "exec", "--help").Output()
	if e != nil || !strings.Contains(string(help), "--json") {
		return version, fmt.Errorf("installed Codex does not advertise exec --json support; update Codex")
	}
	return version, nil
}
func (a Adapter) Normalize(b []byte) events.Record {
	return events.Normalize(b, a.MaxPayload, a.OmitTask)
}
func (a Adapter) Run(ctx context.Context, root, task string, sink agents.EventSink) (agents.Result, error) {
	result := agents.Result{ExitCode: 1}
	runCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	args := []string{"exec", "--json"}
	if a.Model != "" {
		args = append(args, "--model", a.Model)
	}
	if a.Sandbox != "" {
		if a.Sandbox != "read-only" && a.Sandbox != "workspace-write" {
			return result, fmt.Errorf("unsupported explicit sandbox override")
		}
		args = append(args, "--sandbox", a.Sandbox)
	}
	args = append(args, "-")
	cmd := exec.CommandContext(runCtx, a.binary(), args...)
	cmd.Dir = root
	process.Configure(cmd)
	// Task travels via stdin, not the OS process argument list.
	cmd.Stdin = strings.NewReader(task)
	cmd.Stderr = io.Discard
	cmd.WaitDelay = 3 * time.Second
	stdout, e := cmd.StdoutPipe()
	if e != nil {
		return result, e
	}
	if e = cmd.Start(); e != nil {
		return result, fmt.Errorf("could not start Codex: %w", e)
	}
	parseErr := events.ReadJSONL(stdout, 4<<20, func(line []byte, oversized bool) error {
		var r events.Record
		if oversized {
			r = events.Record{Kind: "oversized", Payload: []byte(`{"source":"codex","omitted":true,"reason":"JSONL line exceeds 4 MiB"}`)}
		} else {
			r = a.Normalize(line)
		}
		result.Failed = result.Failed || r.Failed
		result.Completed = result.Completed || r.Completed
		if e := sink(r); e != nil {
			cancel()
			return e
		}
		return nil
	})
	waitErr := cmd.Wait()
	if cmd.ProcessState != nil {
		result.ExitCode = cmd.ProcessState.ExitCode()
		if result.ExitCode < 0 {
			result.ExitCode = 1
		}
	}
	if parseErr != nil {
		return result, fmt.Errorf("recording interrupted: %w", parseErr)
	}
	if ctx.Err() != nil {
		result.ExitCode = 130
		return result, ctx.Err()
	}
	if waitErr != nil {
		var ee *exec.ExitError
		if errors.As(waitErr, &ee) {
			return result, fmt.Errorf("Codex exited with status %d; inspect recorded events", result.ExitCode)
		}
		return result, waitErr
	}
	if result.Failed || !result.Completed {
		return result, fmt.Errorf("Codex stream ended without a successful turn.completed event")
	}
	return result, nil
}
