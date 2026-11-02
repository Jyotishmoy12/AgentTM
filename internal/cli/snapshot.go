package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"text/tabwriter"

	"agenttm/internal/snapshot"
)

func snapshotCommand(ctx context.Context, args []string, e *snapshot.Engine, out io.Writer) (error, int) {
	switch args[0] {
	case "checkpoint":
		if len(args) != 2 {
			return fmt.Errorf("usage: agenttm checkpoint <session-id> (observe the current workspace)"), 2
		}
		r, err := e.Capture(ctx, args[1], "manual")
		if err != nil {
			return err, 1
		}
		printCapture(out, r)
		return nil, 0
	case "checkpoints":
		if len(args) != 2 {
			return fmt.Errorf("usage: agenttm checkpoints <session-id>"), 2
		}
		list, err := e.List(args[1])
		if err != nil {
			return err, 1
		}
		if len(list) == 0 {
			fmt.Fprintln(out, "No checkpoints. Phase 1 sessions have no historical snapshots; start a new recording.")
			return nil, 0
		}
		w := tabwriter.NewWriter(out, 0, 4, 2, ' ', 0)
		fmt.Fprintln(w, "ID\tKIND\tCREATED (UTC)\tFILES\tPARTIAL\tOMISSIONS")
		for _, m := range list {
			fmt.Fprintf(w, "%s\t%s\t%s\t%d\t%t\t%d\n", m.ID, m.Kind, m.CreatedAt, len(m.Files), m.Partial, len(m.Omissions))
		}
		return w.Flush(), 0
	case "show":
		if len(args) != 2 {
			return fmt.Errorf("usage: agenttm show <checkpoint-id>"), 2
		}
		m, err := e.Load(args[1])
		if err != nil {
			return err, 1
		}
		enc := json.NewEncoder(out)
		enc.SetIndent("", "  ")
		return enc.Encode(m), 0
	case "cat":
		if len(args) != 3 {
			return fmt.Errorf("usage: agenttm cat <checkpoint-id> <repo-relative-path>"), 2
		}
		b, err := e.File(args[1], args[2])
		if err != nil {
			return err, 1
		}
		if !snapshot.Text(b) {
			return fmt.Errorf("binary file; inspect object metadata using agenttm show"), 1
		}
		if len(b) > 1<<20 {
			return fmt.Errorf("text output exceeds 1 MiB CLI limit; inspect manifest metadata instead"), 1
		}
		_, err = out.Write(b)
		return err, 0
	case "diff":
		if len(args) != 2 {
			return fmt.Errorf("usage: agenttm diff <checkpoint-id> (compare with parent)"), 2
		}
		changes, err := e.Diff(args[1])
		if err != nil {
			return err, 1
		}
		enc := json.NewEncoder(out)
		enc.SetIndent("", "  ")
		return enc.Encode(changes), 0
	}
	return fmt.Errorf("unknown snapshot command"), 2
}
func printCapture(out io.Writer, r snapshot.CaptureResult) {
	action := "Created"
	if !r.Created {
		action = "Unchanged; reusing"
	}
	fmt.Fprintf(out, "%s checkpoint %s (%d files)\n", action, r.Manifest.ID, len(r.Manifest.Files))
	if r.Manifest.Partial {
		fmt.Fprintf(out, "PARTIAL snapshot: %d omissions; inspect with agenttm show %s\n", len(r.Manifest.Omissions), r.Manifest.ID)
	}
	if r.Manifest.PotentiallyInconsistent {
		fmt.Fprintln(out, "Workspace changed during scan; checkpoint is potentially inconsistent.")
	}
}
