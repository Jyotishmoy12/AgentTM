package snapshot

import (
	"context"
	"fmt"
	"io"
	"sort"
	"strings"

	"agenttm/internal/project"
)

func (b *limitedBuffer) Write(p []byte) (int, error) {
	if len(p) > b.max-b.Len() {
		return 0, fmt.Errorf("Git candidate list exceeds 16 MiB")
	}
	return b.Buffer.Write(p)
}

func candidates(ctx context.Context, root string) ([]string, error) {
	cmd := project.Command(ctx, root, "-c", "core.fsmonitor=false", "ls-files", "--cached", "--others", "--exclude-standard", "-z")
	b := &limitedBuffer{max: 16 << 20}
	cmd.Stdout = b
	cmd.Stderr = io.Discard
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("cannot enumerate Git snapshot candidates: %w", err)
	}
	unique := map[string]bool{}
	for _, v := range strings.Split(b.String(), "\x00") {
		if v != "" {
			unique[strings.TrimSuffix(v, "/")] = true
		}
	}
	if len(unique) > MaxFiles {
		return nil, fmt.Errorf("snapshot candidate limit exceeded (%d)", MaxFiles)
	}
	out := make([]string, 0, len(unique))
	for v := range unique {
		out = append(out, v)
	}
	sort.Strings(out)
	return out, nil
}
