package snapshot

import (
	"fmt"
	"io"
	"os"
	"path/filepath"

	"agenttm/internal/project"
)

func boundedRead(path string, max int64) ([]byte, error) {
	if e := project.SafePath(path); e != nil {
		return nil, e
	}
	f, e := os.Open(path)
	if e != nil {
		return nil, e
	}
	defer f.Close()
	st, e := f.Stat()
	if e != nil {
		return nil, e
	}
	if !st.Mode().IsRegular() {
		return nil, fmt.Errorf("not a regular stored file: %s", path)
	}
	if st.Size() > max {
		return nil, fmt.Errorf("stored file exceeds read limit: %s", path)
	}
	b, e := io.ReadAll(io.LimitReader(f, max+1))
	if e != nil {
		return nil, e
	}
	if int64(len(b)) > max {
		return nil, fmt.Errorf("stored file exceeds read limit")
	}
	return b, nil
}

func atomicWrite(path string, b []byte) error {
	tmp, err := stageFile(path, b)
	if err != nil {
		return err
	}
	defer os.Remove(tmp)
	return os.Rename(tmp, path)
}

func stageFile(path string, b []byte) (tmp string, err error) {
	if e := project.SafePath(path); e != nil {
		return "", e
	}
	if e := os.MkdirAll(filepath.Dir(path), 0700); e != nil {
		return "", e
	}
	if _, e := os.Lstat(path); e == nil {
		return "", fmt.Errorf("immutable destination already exists: %s", path)
	} else if !os.IsNotExist(e) {
		return "", e
	}
	f, e := os.CreateTemp(filepath.Dir(path), ".tmp-")
	if e != nil {
		return "", e
	}
	tmp = f.Name()
	defer func() {
		if err != nil {
			os.Remove(tmp)
		}
	}()
	if _, e = f.Write(b); e != nil {
		f.Close()
		return tmp, e
	}
	if e = f.Sync(); e != nil {
		f.Close()
		return tmp, e
	}
	if e = f.Close(); e != nil {
		return tmp, e
	}
	return tmp, nil
}
