package cli

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"text/tabwriter"
	"time"

	"agenttm/internal/agents/codex"
	"agenttm/internal/config"
	"agenttm/internal/events"
	"agenttm/internal/project"
	"agenttm/internal/storage"
)

var Version = "0.1.0-phase1"
var Commit = "development"

const usage = `AgentTM - local Codex event recorder (Phase 1)

  agenttm init
  agenttm version
  agenttm doctor
  agenttm codex doctor
  agenttm run codex [--model MODEL] -- "task"
  agenttm sessions
  agenttm events <session-id> [--after N] [--limit N]

Only runs launched through AgentTM are recorded. Snapshots, UI and fork
are later milestones. Events show observations, not complete agent activity.
`

func Run(ctx context.Context, args []string, out, errOut io.Writer) int {
	e, code := execute(ctx, args, out, errOut)
	if e != nil {
		fmt.Fprintln(errOut, "agenttm:", e)
		if code == 0 {
			code = 1
		}
	}
	return code
}
func execute(ctx context.Context, args []string, out, errOut io.Writer) (error, int) {
	if len(args) == 0 || args[0] == "help" || args[0] == "--help" {
		fmt.Fprint(out, usage)
		return nil, 0
	}
	if args[0] == "version" {
		fmt.Fprintf(out, "agenttm %s (%s)\n", Version, Commit)
		return nil, 0
	}
	if args[0] == "codex" && len(args) == 2 && args[1] == "doctor" {
		return codexDoctor(ctx, out), 0
	}
	dir, e := os.Getwd()
	if e != nil {
		return e, 1
	}
	root, e := project.Root(dir)
	if e != nil {
		return e, 1
	}
	if args[0] == "init" {
		if len(args) != 1 {
			return fmt.Errorf("usage: agenttm init"), 2
		}
		if e = project.Init(root); e != nil {
			return e, 1
		}
		s, e := storage.Open(root)
		if e != nil {
			return e, 1
		}
		defer s.DB.Close()
		fmt.Fprintf(out, "Initialized AgentTM at %s\n", filepath.Join(root, ".agenttm"))
		return nil, 0
	}
	if e = project.SafePath(filepath.Join(root, ".agenttm", "config.json")); e != nil {
		return e, 1
	}
	c, e := config.Load(filepath.Join(root, ".agenttm", "config.json"))
	if e != nil {
		return fmt.Errorf("cannot load AgentTM config; run agenttm init first: %w", e), 1
	}
	if _, e = os.Stat(filepath.Join(root, ".agenttm", "data", "events.db")); e != nil {
		return fmt.Errorf("AgentTM database is missing or inaccessible; inspect .agenttm/data before running init: %w", e), 1
	}
	s, e := storage.Open(root)
	if e != nil {
		return e, 1
	}
	defer s.DB.Close()
	switch args[0] {
	case "doctor":
		var check string
		if e = s.DB.QueryRow("PRAGMA integrity_check").Scan(&check); e != nil {
			return e, 1
		}
		if check != "ok" {
			return fmt.Errorf("database integrity check failed"), 1
		}
		fmt.Fprintln(out, "Repository, config and SQLite integrity: OK")
		fmt.Fprintln(out, "Snapshot/blob verification: not implemented until Milestone 2")
		var active int
		if e = s.DB.QueryRow("SELECT count(*) FROM sessions WHERE project_id=? AND status='active'", s.ProjectID).Scan(&active); e != nil {
			return e, 1
		}
		if active > 0 {
			fmt.Fprintf(out, "%d active sessions; an active status can remain after a forced process termination.\n", active)
		}
		return codexDoctor(ctx, out), 0
	case "sessions":
		sessions, e := s.Sessions()
		if e != nil {
			return e, 1
		}
		if len(sessions) == 0 {
			fmt.Fprintln(out, "No sessions. Run: agenttm run codex -- \"your task\"")
			return nil, 0
		}
		w := tabwriter.NewWriter(out, 0, 4, 2, ' ', 0)
		fmt.Fprintln(w, "ID\tAGENT\tSTARTED (UTC)\tSTATUS\tEXIT")
		for _, v := range sessions {
			exit := "-"
			if v.ExitCode.Valid {
				exit = fmt.Sprint(v.ExitCode.Int64)
			}
			fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%s\n", v.ID, v.Agent, v.StartedAt, v.Status, exit)
		}
		return w.Flush(), 0
	case "events":
		if len(args) < 2 {
			return fmt.Errorf("usage: agenttm events <session-id> [--after N] [--limit N]"), 2
		}
		fs := flag.NewFlagSet("events", flag.ContinueOnError)
		fs.SetOutput(errOut)
		after := fs.Int64("after", 0, "exclusive sequence cursor")
		limit := fs.Int("limit", 100, "1..1000 events")
		if e = fs.Parse(args[2:]); e != nil {
			return e, 2
		}
		if fs.NArg() != 0 {
			return fmt.Errorf("unexpected events arguments"), 2
		}
		records, e := s.Events(args[1], *after, *limit)
		if e != nil {
			return e, 1
		}
		enc := json.NewEncoder(out)
		for _, v := range records {
			if e = enc.Encode(v); e != nil {
				return e, 1
			}
		}
		return nil, 0
	case "run":
		if len(args) < 2 || args[1] != "codex" {
			return fmt.Errorf("usage: agenttm run codex [--model MODEL] -- \"task\""), 2
		}
		fs := flag.NewFlagSet("run codex", flag.ContinueOnError)
		fs.SetOutput(errOut)
		model := fs.String("model", "", "explicit Codex model override")
		if e = fs.Parse(args[2:]); e != nil {
			return e, 2
		}
		if fs.NArg() != 1 || strings.TrimSpace(fs.Arg(0)) == "" {
			return fmt.Errorf("provide one quoted task after --"), 2
		}
		task := fs.Arg(0)
		omit := task
		if c.Capture.PromptMode == "sanitized" {
			omit = ""
		}
		adapter := codex.Adapter{Model: *model, MaxPayload: c.Capture.MaxEventPayloadBytes, OmitTask: omit}
		version, e := adapter.Available(ctx)
		if e != nil {
			return e, 1
		}
		id, e := s.Start()
		if e != nil {
			return e, 1
		}
		fmt.Fprintf(errOut, "Recording session %s (%s)\n", id, version)
		fmt.Fprintln(errOut, "Phase 1 records events only; no workspace checkpoints are captured.")
		start := time.Now()
		meta := map[string]any{"source": "agenttm", "prompt_bytes": len(task), "prompt_mode": c.Capture.PromptMode, "codex_version": version, "model_override": events.Redact(*model)}
		if c.Capture.PromptMode == "sanitized" {
			meta["prompt"] = events.Redact(task)
			if len(task) > c.Capture.MaxEventPayloadBytes/2 {
				delete(meta, "prompt")
				meta["prompt_omitted_for_size"] = true
			}
		}
		b := events.Encode(meta, c.Capture.MaxEventPayloadBytes, "")
		if e = s.Append(id, "agenttm.run.started", "", "", b); e != nil {
			_ = s.Finish(id, "recording_failed", 1)
			return e, 1
		}
		captureFailed := false
		result, runErr := adapter.Run(ctx, root, task, func(r events.Record) error {
			if e := s.Append(id, r.Kind, r.Tool, r.Call, r.Payload); e != nil {
				captureFailed = true
				return e
			}
			if r.Upstream != "" {
				if _, e := s.DB.Exec("UPDATE sessions SET upstream_session_id=? WHERE id=?", r.Upstream, id); e != nil {
					captureFailed = true
					return e
				}
			}
			fmt.Fprintln(errOut, "  observed", r.Kind)
			return nil
		})
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
		// Minimal operational log; no prompt, tool output, stderr or raw events.
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
	default:
		return fmt.Errorf("unknown command %q; run agenttm help", args[0]), 2
	}
}

func codexDoctor(ctx context.Context, out io.Writer) error {
	a := codex.Adapter{}
	version, e := a.Available(ctx)
	if e != nil {
		return e
	}
	fmt.Fprintf(out, "Codex: %s; exec --json advertised\n", version)
	checkCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if e = exec.CommandContext(checkCtx, "codex", "login", "status").Run(); e != nil {
		return fmt.Errorf("Codex login readiness could not be confirmed; run codex login, then retry")
	}
	fmt.Fprintln(out, "Codex login status: OK (model access and network require a real run)")
	return nil
}
