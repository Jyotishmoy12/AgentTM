package cli

import (
	"flag"
	"fmt"
	"io"
	"os"

	"agenttm/internal/maintenance"
	"agenttm/internal/snapshot"
)

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
