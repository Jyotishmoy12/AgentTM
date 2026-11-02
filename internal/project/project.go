package project

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"agenttm/internal/config"
)

func Command(ctx context.Context, dir string, args ...string) *exec.Cmd {
	c := exec.CommandContext(ctx, "git", append([]string{"-C", dir}, args...)...)
	// Ambient Git overrides must not redirect an isolated restore to the user's
	// original index/worktree, nor alter repository discovery during capture.
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
func Root(dir string) (string, error) {
	r, e := Git(dir, "rev-parse", "--show-toplevel")
	if e != nil {
		var ee *exec.ExitError
		if errors.As(e, &ee) && bytes.Contains(ee.Stderr, []byte("dubious ownership")) {
			return "", fmt.Errorf("Git refused repository ownership; run git status here and resolve the reported ownership issue")
		}
		return "", fmt.Errorf("not inside a Git working tree; run git init first")
	}
	r, e = filepath.EvalSymlinks(r)
	if e != nil {
		return "", e
	}
	return filepath.Abs(r)
}

// Canonicalize the repository prefix, then check every protected component.
// OS aliases above a repository (macOS /var -> /private/var, for example) are
// legitimate. Symlinks at or beneath .agenttm/.git must still be rejected.
func SafePath(path string) error {
	p, e := filepath.Abs(path)
	if e != nil {
		return e
	}
	anchor := ""
	for current := p; ; current = filepath.Dir(current) {
		name := filepath.Base(current)
		if strings.EqualFold(name, ".agenttm") || strings.EqualFold(name, ".git") {
			anchor = filepath.Dir(current)
		}
		if filepath.Dir(current) == current {
			break
		}
	}
	if anchor != "" {
		relative, err := filepath.Rel(anchor, p)
		if err != nil {
			return err
		}
		canonical, err := filepath.EvalSymlinks(anchor)
		if err != nil {
			return err
		}
		p = filepath.Join(canonical, relative)
	}
	for {
		st, e := os.Lstat(p)
		if e == nil && st.Mode()&os.ModeSymlink != 0 {
			return fmt.Errorf("refusing symlink in storage path: %s", p)
		}
		if e != nil && !os.IsNotExist(e) {
			return e
		}
		parent := filepath.Dir(p)
		if parent == p {
			break
		}
		p = parent
	}
	return nil
}
func Init(root string) error {
	base := filepath.Join(root, ".agenttm")
	if e := SafePath(base); e != nil {
		return e
	}
	for _, p := range []string{"data", "objects", "logs"} {
		target := filepath.Join(base, p)
		if e := SafePath(target); e != nil {
			return e
		}
		if e := os.MkdirAll(target, 0700); e != nil {
			return e
		}
	}
	cp := filepath.Join(base, "config.json")
	if e := SafePath(cp); e != nil {
		return e
	}
	b, _ := json.MarshalIndent(config.Default(), "", "  ")
	f, e := os.OpenFile(cp, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if e == nil {
		_, e = f.Write(append(b, '\n'))
		ce := f.Close()
		if e == nil {
			e = ce
		}
	} else if os.IsExist(e) {
		_, e = config.Load(cp)
	}
	if e != nil {
		return e
	}
	exclude, e := Git(root, "rev-parse", "--git-path", "info/exclude")
	if e != nil {
		return e
	}
	if !filepath.IsAbs(exclude) {
		exclude = filepath.Join(root, exclude)
	}
	if e = SafePath(exclude); e != nil {
		return e
	}
	if e = os.MkdirAll(filepath.Dir(exclude), 0700); e != nil {
		return e
	}
	old, e := os.ReadFile(exclude)
	if e != nil && !os.IsNotExist(e) {
		return e
	}
	for _, line := range strings.Split(string(old), "\n") {
		if strings.TrimSpace(line) == "/.agenttm/" {
			return nil
		}
	}
	f, e = os.OpenFile(exclude, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
	if e != nil {
		return e
	}
	_, e = f.WriteString("\n# AgentTM local recording data\n/.agenttm/\n")
	ce := f.Close()
	if e != nil {
		return e
	}
	return ce
}
