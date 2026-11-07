package desktop

import (
	"context"
	"path/filepath"
	"runtime"
	"strings"

	"agenttm/internal/project"
)

func repositoryState(ctx context.Context, root string) string {
	output, err := project.Command(ctx, root, "rev-parse", "--show-toplevel").Output()
	if err != nil {
		return "invalid"
	}
	discovered, err := filepath.EvalSymlinks(strings.TrimSpace(string(output)))
	if err != nil {
		return "invalid"
	}
	expected, err := filepath.EvalSymlinks(root)
	if err != nil {
		return "invalid"
	}
	discovered, err = filepath.Abs(discovered)
	if err != nil {
		return "invalid"
	}
	expected, err = filepath.Abs(expected)
	if err != nil {
		return "invalid"
	}
	same := discovered == expected
	if runtime.GOOS == "windows" {
		same = strings.EqualFold(discovered, expected)
	}
	if !same {
		return "changed"
	}
	return "valid"
}
