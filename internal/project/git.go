package project

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"agenttm/internal/process"
)

func Command(ctx context.Context, dir string, args ...string) *exec.Cmd {
	c := exec.CommandContext(ctx, "git", append([]string{"-C", dir}, args...)...)
	process.HideWindow(c)
	for _, v := range os.Environ() {
		key := strings.ToUpper(strings.SplitN(v, "=", 2)[0])
		if !strings.HasPrefix(key, "GIT_") || key == "GIT_CEILING_DIRECTORIES" {
			c.Env = append(c.Env, v)
		}
	}
	c.Env = append(c.Env, "GIT_OPTIONAL_LOCKS=0")
	return c
}

func Git(dir string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	c := Command(ctx, dir, args...)
	b, e := c.Output()
	if e != nil {
		return "", fmt.Errorf("git %s failed: %w", strings.Join(args, " "), e)
	}
	return strings.TrimSpace(string(b)), nil
}
