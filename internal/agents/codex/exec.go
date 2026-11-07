package codex

import (
	"context"
	"errors"
	"fmt"
	"os/exec"

	"agenttm/internal/agents"
	"agenttm/internal/events"
)

func (a Adapter) Run(ctx context.Context, root, task string, sink agents.EventSink) (agents.Result, error) {
	result := agents.Result{ExitCode: 1}
	runCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	cmd, e := a.command(runCtx, root, task)
	if e != nil {
		return result, e
	}
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
