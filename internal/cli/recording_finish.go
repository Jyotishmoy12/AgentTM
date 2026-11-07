package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"agenttm/internal/project"
)

func finishRecording(ctx context.Context, recording recordingResult) (error, int) {
	engine, id, result, runErr := recording.engine, recording.id, recording.result, recording.runErr
	root, s, errOut := engine.Root, engine.Store, recording.output
	captureFailed, start := recording.captureFailed, recording.started
	var e error
	var b []byte
	finalCtx, finishCapture := context.WithTimeout(context.Background(), 2*time.Minute)
	final, finalErr := engine.Capture(finalCtx, id, "final")
	finishCapture()
	if finalErr != nil {
		captureFailed = true
		fmt.Fprintln(errOut, "Final snapshot failed:", finalErr)
	} else {
		printCapture(errOut, final)
	}
	status := "completed"
	code := result.ExitCode
	if runErr != nil {
		status = "failed"
		if code == 0 {
			code = 1
		}
	}
	if ctx.Err() != nil {
		status = "cancelled"
		code = 130
	}
	if captureFailed {
		status = "recording_failed"
		code = 1
	}
	b, _ = json.Marshal(map[string]any{"source": "agenttm", "exit_code": result.ExitCode, "elapsed_ms": time.Since(start).Milliseconds(), "status": status, "stderr": "discarded for privacy; inspect sanitized JSONL error events"})
	persistErr := s.Append(id, "agenttm.process.exited", "", "", b)
	if persistErr != nil {
		status = "recording_failed"
		code = 1
	}
	if e = s.Finish(id, status, code); e != nil {
		return fmt.Errorf("could not finalize session %s: %w", id, e), 1
	}
	logPath := filepath.Join(root, ".agenttm", "logs", id+".json")
	if e = project.SafePath(logPath); e != nil {
		return e, 1
	}
	if e = os.WriteFile(logPath, append(b, '\n'), 0600); e != nil {
		return fmt.Errorf("cannot write session summary: %w", e), 1
	}
	fmt.Fprintf(errOut, "Session %s: %s. Inspect: agenttm events %s\n", id, status, id)
	if persistErr != nil {
		return persistErr, 1
	}
	return runErr, code
}
