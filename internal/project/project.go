package project

import (
	"bytes"
	"errors"
	"fmt"
	"os/exec"
	"path/filepath"
)

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
