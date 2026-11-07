package codex

import (
	"context"
	"fmt"
	"io"
	"os/exec"
	"strings"
	"time"

	"agenttm/internal/process"
)

func (a Adapter) command(ctx context.Context, root, task string) (*exec.Cmd, error) {
	args := []string{"exec", "--json"}
	if a.Model != "" {
		args = append(args, "--model", a.Model)
	}
	if a.Sandbox != "" {
		if a.Sandbox != "read-only" && a.Sandbox != "workspace-write" {
			return nil, fmt.Errorf("unsupported explicit sandbox override")
		}
		args = append(args, "--sandbox", a.Sandbox)
	}
	args = append(args, "-")
	cmd := exec.CommandContext(ctx, a.binary(), args...)
	cmd.Dir = root
	process.Configure(cmd)
	cmd.Stdin = strings.NewReader(task)
	cmd.Stderr = io.Discard
	cmd.WaitDelay = 3 * time.Second
	return cmd, nil
}
