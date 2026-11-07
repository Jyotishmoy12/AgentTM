package cli

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"

	"agenttm/internal/config"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

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
		fmt.Fprintf(out, "agenttm %s (%s) %s/%s %s built %s\n", Version, Commit, runtime.GOOS, runtime.GOARCH, runtime.Version(), BuildDate)
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
	engine := &snapshot.Engine{Root: root, Store: s, Config: c}
	return dispatch(ctx, args, engine, out, errOut)
}
