package cli

import (
	"flag"
	"fmt"
	"io"
	"strings"
)

func parseRunOptions(args []string, scanTools bool, errOut io.Writer) (runOptions, error) {
	var options runOptions
	if len(args) < 2 || args[1] != "codex" {
		return options, fmt.Errorf("usage: agenttm run codex [--model MODEL] -- \"task\"")
	}
	fs := flag.NewFlagSet("run codex", flag.ContinueOnError)
	fs.SetOutput(errOut)
	fs.StringVar(&options.model, "model", "", "explicit Codex model override")
	fs.StringVar(&options.sandbox, "sandbox", "", "explicit read-only or workspace-write override; default honors Codex configuration")
	fs.BoolVar(&options.scanTools, "snapshot-after-tool", scanTools, "capture workspace observations at supported tool boundaries")
	if err := fs.Parse(args[2:]); err != nil {
		return options, err
	}
	if fs.NArg() != 1 || strings.TrimSpace(fs.Arg(0)) == "" {
		return options, fmt.Errorf("provide one quoted task after --")
	}
	options.task = fs.Arg(0)
	if len(options.task) > 1<<20 {
		return options, fmt.Errorf("task exceeds 1 MiB")
	}
	if options.sandbox != "" && options.sandbox != "read-only" && options.sandbox != "workspace-write" {
		return options, fmt.Errorf("--sandbox must be read-only or workspace-write")
	}
	return options, nil
}
