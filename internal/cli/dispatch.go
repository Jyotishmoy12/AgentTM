package cli

import (
	"context"
	"fmt"
	"io"

	"agenttm/internal/snapshot"
)

func dispatch(ctx context.Context, args []string, engine *snapshot.Engine, out, errOut io.Writer) (error, int) {
	switch args[0] {
	case "operations":
		return operationsCommand(args, engine.Store, out, errOut)
	case "fork":
		return forkCommand(ctx, args[1:], engine, out, errOut)
	case "purge":
		return purgeCommand(args[1:], engine, out, errOut)
	case "gc":
		return gcCommand(args[1:], engine, out, errOut)
	case "forks":
		return listForks(engine, out), 0
	case "ui":
		return uiCommand(ctx, args[1:], engine, out, errOut)
	case "desktop":
		return desktopCommand(ctx, args[1:], engine, out, errOut)
	case "checkpoint", "checkpoints", "show", "cat", "diff":
		return snapshotCommand(ctx, args, engine, out)
	case "doctor":
		return doctorCommand(ctx, engine, out)
	case "sessions":
		return sessionsCommand(engine.Store, out)
	case "events":
		return eventsCommand(args, engine.Store, out, errOut)
	case "run":
		return runCommand(ctx, args, engine, errOut)
	default:
		return fmt.Errorf("unknown command %q; run agenttm help", args[0]), 2
	}
}
