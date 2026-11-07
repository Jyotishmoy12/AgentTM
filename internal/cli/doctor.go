package cli

import (
	"context"
	"fmt"
	"io"
	"os/exec"
	"time"

	"agenttm/internal/agents/codex"
	"agenttm/internal/process"
	"agenttm/internal/snapshot"
)

func doctorCommand(ctx context.Context, engine *snapshot.Engine, out io.Writer) (error, int) {
	s := engine.Store
	var e error
	var check string
	if e = s.DB.QueryRow("PRAGMA integrity_check").Scan(&check); e != nil {
		return e, 1
	}
	if check != "ok" {
		return fmt.Errorf("database integrity check failed"), 1
	}
	fmt.Fprintln(out, "Repository, config and SQLite integrity: OK")
	report := engine.Doctor()
	fmt.Fprintf(out, "Snapshot integrity: %d checkpoints, %d objects\n", report.Checkpoints, report.Objects)
	for _, warning := range report.Warnings {
		fmt.Fprintln(out, "WARNING:", warning)
	}
	for _, problem := range report.Problems {
		fmt.Fprintln(out, "ERROR:", problem)
	}
	if len(report.Problems) > 0 {
		return fmt.Errorf("snapshot integrity check failed; restore missing/corrupt storage from backup; no data was removed"), 1
	}
	var active int
	if e = s.DB.QueryRow("SELECT count(*) FROM sessions WHERE project_id=? AND status='active'", s.ProjectID).Scan(&active); e != nil {
		return e, 1
	}
	if active > 0 {
		fmt.Fprintf(out, "%d active sessions; an active status can remain after a forced process termination.\n", active)
	}
	return codexDoctor(ctx, out), 0
}

func codexDoctor(ctx context.Context, out io.Writer) error {
	a := codex.Adapter{}
	version, e := a.Available(ctx)
	if e != nil {
		return e
	}
	fmt.Fprintf(out, "Codex: %s; exec --json advertised\n", version)
	fmt.Fprintln(out, codex.Compatibility(version))
	checkCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	login := exec.CommandContext(checkCtx, "codex", "login", "status")
	process.HideWindow(login)
	if e = login.Run(); e != nil {
		return fmt.Errorf("Codex login readiness could not be confirmed; run codex login, then retry")
	}
	fmt.Fprintln(out, "Codex login status: OK (model access and network require a real run)")
	return nil
}
