package cli

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"text/tabwriter"

	"agenttm/internal/storage"
)

func operationsCommand(args []string, s *storage.Store, out, errOut io.Writer) (error, int) {
	if len(args) < 2 {
		return fmt.Errorf("usage: agenttm operations <session-id> [--after N] [--limit N]"), 2
	}
	fs := flag.NewFlagSet("operations", flag.ContinueOnError)
	fs.SetOutput(errOut)
	after := fs.Int64("after", 0, "Exclusive operation cursor")
	limit := fs.Int("limit", 50, "Maximum operations (1..100)")
	if err := fs.Parse(args[2:]); err != nil {
		return err, 2
	}
	if fs.NArg() != 0 {
		return fmt.Errorf("unexpected arguments"), 2
	}
	items, err := s.Operations(args[1], *after, *limit)
	if err != nil {
		return err, 1
	}
	enc := json.NewEncoder(out)
	for _, item := range items {
		if err = enc.Encode(item); err != nil {
			return err, 1
		}
	}
	return nil, 0
}

func sessionsCommand(s *storage.Store, out io.Writer) (error, int) {
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
}

func eventsCommand(args []string, s *storage.Store, out, errOut io.Writer) (error, int) {
	var e error
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
}
