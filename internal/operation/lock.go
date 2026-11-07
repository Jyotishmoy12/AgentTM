package operation

import (
	"fmt"
	"os"
	"path/filepath"

	"agenttm/internal/project"
)

func Acquire(root, name string) (func(), error) {
	p := filepath.Join(root, ".agenttm", "data", name+".lock")
	if err := project.SafePath(p); err != nil {
		return nil, err
	}
	f, err := os.OpenFile(p, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if os.IsExist(err) {
		return nil, fmt.Errorf("%s is locked; run agenttm doctor and confirm no operation is running before removing a stale lock", name)
	}
	if err != nil {
		return nil, err
	}
	if _, err = fmt.Fprintf(f, "pid=%d\n", os.Getpid()); err != nil {
		f.Close()
		os.Remove(p)
		return nil, err
	}
	return func() { f.Close(); os.Remove(p) }, nil
}
