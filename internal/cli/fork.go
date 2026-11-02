package cli

import (
	"context"
	"flag"
	"fmt"
	"io"
	"os"
	"text/tabwriter"

	"agenttm/internal/fork"
	"agenttm/internal/maintenance"
	"agenttm/internal/snapshot"
)

func listForks(engine *snapshot.Engine, out io.Writer) error {
	rows, err := engine.Store.DB.Query("SELECT f.id,f.branch_name,f.worktree_path,f.status FROM forks f JOIN checkpoints c ON c.id=f.checkpoint_id JOIN sessions s ON s.id=c.session_id WHERE s.project_id=? ORDER BY f.rowid", engine.Store.ProjectID)
	if err != nil {
		return err
	}
	defer rows.Close()
	w := tabwriter.NewWriter(out, 0, 4, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tBRANCH\tSTATUS\tWORKTREE")
	for rows.Next() {
		var id, branch, p, status string
		if err = rows.Scan(&id, &branch, &p, &status); err != nil {
			return err
		}
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", id, branch, status, p)
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return w.Flush()
}

func forkCommand(ctx context.Context, args []string, engine *snapshot.Engine, out, errOut io.Writer) (error, int) {
	if len(args) < 1 {
		return fmt.Errorf("usage: agenttm fork <checkpoint-id> --name <name> [--allow-partial]"), 2
	}
	flags := flag.NewFlagSet("fork", flag.ContinueOnError)
	flags.SetOutput(errOut)
	name := flags.String("name", "", "new fork name")
	allow := flags.Bool("allow-partial", false, "restore only captured files from a partial checkpoint")
	if err := flags.Parse(args[1:]); err != nil {
		return err, 2
	}
	if flags.NArg() != 0 || *name == "" {
		return fmt.Errorf("provide --name after the checkpoint ID"), 2
	}
	service := fork.Service{Engine: engine}
	plan, err := service.Preview(ctx, args[0], *name)
	if err != nil {
		return err, 1
	}
	for _, warning := range plan.Warnings {
		fmt.Fprintln(errOut, "WARNING:", warning)
	}
	fmt.Fprintf(out, "Fork destination: %s\nBranch: %s\n", plan.WorktreePath, plan.BranchName)
	result, err := service.Create(ctx, args[0], *name, *allow)
	if err != nil {
		return err, 1
	}
	fmt.Fprintf(out, "Restored and verified checkpoint %s\nOpen: %s\nThe fork may be dirty relative to Git HEAD. Original workspace was not changed.\n", result.CheckpointID, result.WorktreePath)
	return nil, 0
}
func purgeCommand(args []string, engine *snapshot.Engine, out, errOut io.Writer) (error, int) {
	flags := flag.NewFlagSet("purge", flag.ContinueOnError)
	flags.SetOutput(errOut)
	id := flags.String("session", "", "session UUID to remove")
	yes := flags.Bool("yes", false, "confirm logical deletion without an interactive prompt")
	if err := flags.Parse(args); err != nil {
		return err, 2
	}
	if flags.NArg() != 0 || !snapshot.ValidID(*id) {
		return fmt.Errorf("usage: agenttm purge --session <session-id> [--yes]"), 2
	}
	if !*yes {
		fmt.Fprintf(out, "Delete session %s, its events and checkpoint manifests? Shared blobs remain.\nType the complete session ID to confirm: ", *id)
		var answer string
		if _, err := fmt.Fscan(os.Stdin, &answer); err != nil || answer != *id {
			return fmt.Errorf("purge cancelled; no data removed"), 1
		}
	}
	result, err := maintenance.Purge(engine.Root, engine.Store, *id)
	if err != nil {
		return err, 1
	}
	fmt.Fprintf(out, "Purged %s: %d events, %d checkpoints.\n", result.SessionID, result.Events, result.Checkpoints)
	for _, warning := range result.Warnings {
		fmt.Fprintln(out, warning)
	}
	return nil, 0
}
