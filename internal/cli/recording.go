package cli

import (
	"context"
	"fmt"
	"io"
	"time"

	"agenttm/internal/agents/codex"
	"agenttm/internal/capture"
	"agenttm/internal/events"
	"agenttm/internal/operation"
	"agenttm/internal/snapshot"
)

func runCommand(ctx context.Context, args []string, engine *snapshot.Engine, errOut io.Writer) (error, int) {
	root, c, s := engine.Root, engine.Config, engine.Store
	unlockRecording, lockErr := operation.Acquire(root, "recording")
	if lockErr != nil {
		return lockErr, 1
	}
	defer unlockRecording()
	options, e := parseRunOptions(args, c.Capture.SnapshotAfterTool, errOut)
	if e != nil {
		return e, 2
	}
	task := options.task
	omit := task
	if c.Capture.PromptMode == "sanitized" {
		omit = ""
	}
	adapter := codex.Adapter{Model: options.model, Sandbox: options.sandbox, MaxPayload: c.Capture.MaxEventPayloadBytes, OmitTask: omit}
	version, e := adapter.Available(ctx)
	if e != nil {
		return e, 1
	}
	id, e := s.Start()
	if e != nil {
		return e, 1
	}
	fmt.Fprintf(errOut, "Recording session %s (%s)\n", id, version)
	fmt.Fprintln(errOut, "Capturing baseline/final workspace state; intermediate observations are best-effort, not proof of causality.")
	if options.sandbox != "" {
		fmt.Fprintln(errOut, "Explicit Codex sandbox:", options.sandbox)
	}
	start := time.Now()
	b := recordingMetadata(c, options, version)
	if e = s.Append(id, "agenttm.run.started", "", "", b); e != nil {
		_ = s.Finish(id, "recording_failed", 1)
		return e, 1
	}
	captureFailed := false
	observer := capture.New(engine, id, options.scanTools)
	baseline, snapshotErr := engine.Capture(ctx, id, "baseline")
	if snapshotErr != nil {
		_ = s.Finish(id, "recording_failed", 1)
		return fmt.Errorf("baseline capture failed; Codex was not launched: %w", snapshotErr), 1
	}
	printCapture(errOut, baseline)
	result, runErr := adapter.Run(ctx, root, task, func(r events.Record) error {
		eventID, appendErr := s.AppendID(id, r.Kind, r.Tool, r.Call, r.Payload)
		if appendErr != nil {
			captureFailed = true
			return appendErr
		}
		if r.Upstream != "" {
			if _, e := s.DB.Exec("UPDATE sessions SET upstream_session_id=? WHERE id=?", r.Upstream, id); e != nil {
				captureFailed = true
				return e
			}
		}
		fmt.Fprintln(errOut, "  observed", r.Kind)
		if err := observer.Observe(ctx, r, eventID); err != nil {
			if ctx.Err() == nil {
				captureFailed = true
			}
			return err
		}
		return nil
	})
	if err := observer.Finish(); err != nil && ctx.Err() == nil {
		captureFailed = true
		fmt.Fprintln(errOut, err)
	}
	return finishRecording(ctx, recordingResult{engine: engine, id: id, result: result, runErr: runErr, captureFailed: captureFailed, started: start, output: errOut})
}
