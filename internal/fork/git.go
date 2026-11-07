package fork

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"agenttm/internal/project"
)

func (s Service) git(ctx context.Context, dir string, args ...string) (string, error) {
	hooks := filepath.Join(s.Engine.Root, ".agenttm", "disabled-hooks")
	if err := project.SafePath(hooks); err != nil {
		return "", err
	}
	if entries, err := os.ReadDir(hooks); err == nil && len(entries) > 0 {
		return "", fmt.Errorf("disabled-hooks directory must remain empty")
	} else if err != nil && !os.IsNotExist(err) {
		return "", err
	}
	cmd := project.Command(ctx, dir, append([]string{"-c", "core.hooksPath=" + hooks, "-c", "core.fsmonitor=false"}, args...)...)
	b, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("git %s failed: %w", args[0], err)
	}
	return strings.TrimSpace(string(b)), nil
}
