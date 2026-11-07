package project

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

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
