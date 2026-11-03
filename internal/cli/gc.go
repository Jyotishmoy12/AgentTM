package cli

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"time"

	"agenttm/internal/maintenance"
	"agenttm/internal/snapshot"
)

func gcCommand(args []string, engine *snapshot.Engine, out, errOut io.Writer) (error, int) {
	flags := flag.NewFlagSet("gc", flag.ContinueOnError)
	flags.SetOutput(errOut)
	apply := flags.Bool("apply", false, "remove unreferenced blob candidates")
	yes := flags.Bool("yes", false, "confirm permanent blob deletion")
	age := flags.Duration("min-age", 24*time.Hour, "minimum unreferenced object age")
	if err := flags.Parse(args); err != nil {
		return err, 2
	}
	if flags.NArg() != 0 || *age < 0 {
		return fmt.Errorf("usage: agenttm gc [--min-age 24h] [--apply --yes]"), 2
	}
	preview, err := maintenance.Collect(engine, false, "", *age)
	if err != nil {
		return err, 1
	}
	if *apply {
		if !*yes {
			return fmt.Errorf("preview found %d unreferenced blobs (%d bytes); use --apply --yes to confirm permanent deletion", preview.Candidates, preview.Bytes), 2
		}
		preview, err = maintenance.Collect(engine, true, preview.Token, *age)
		if err != nil {
			return err, 1
		}
	}
	return json.NewEncoder(out).Encode(preview), 0
}
