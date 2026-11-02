package snapshot

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

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

// Stage in the destination directory, sync and rename. Unreferenced files after
// interruption are safe; doctor reports them and never removes data automatically.
func atomicWrite(path string, b []byte) error {
	if e := project.SafePath(path); e != nil {
		return e
	}
	if e := os.MkdirAll(filepath.Dir(path), 0700); e != nil {
		return e
	}
	if _, e := os.Lstat(path); e == nil {
		return fmt.Errorf("immutable destination already exists: %s", path)
	} else if !os.IsNotExist(e) {
		return e
	}
	f, e := os.CreateTemp(filepath.Dir(path), ".tmp-")
	if e != nil {
		return e
	}
	tmp := f.Name()
	defer os.Remove(tmp)
	if _, e = f.Write(b); e != nil {
		f.Close()
		return e
	}
	if e = f.Sync(); e != nil {
		f.Close()
		return e
	}
	if e = f.Close(); e != nil {
		return e
	}
	return os.Rename(tmp, path)
}
func (e *Engine) objectPath(id string) (string, error) {
	h := strings.TrimPrefix(id, "sha256:")
	if !strings.HasPrefix(id, "sha256:") || !ValidHash(h) {
		return "", fmt.Errorf("invalid object hash")
	}
	return filepath.Join(e.Root, ".agenttm", "objects", h[:2], h), nil
}
func (e *Engine) put(b []byte) (string, error) {
	id := "sha256:" + Hash(b)
	p, _ := e.objectPath(id)
	if _, err := os.Lstat(p); err == nil {
		old, err := e.ReadObject(File{ObjectID: id, Size: int64(len(b))})
		if err != nil {
			return "", err
		}
		if !bytes.Equal(old, b) {
			return "", fmt.Errorf("object collision")
		}
		return id, nil
	} else if !os.IsNotExist(err) {
		return "", err
	}
	if err := atomicWrite(p, b); err != nil {
		return "", err
	}
	return id, nil
}
func (e *Engine) ReadObject(f File) ([]byte, error) {
	p, err := e.objectPath(f.ObjectID)
	if err != nil {
		return nil, err
	}
	if f.Size < 0 || f.Size > MaxBlobBytes {
		return nil, fmt.Errorf("object size outside supported range")
	}
	b, err := boundedRead(p, f.Size)
	if err != nil {
		return nil, err
	}
	if int64(len(b)) != f.Size || "sha256:"+Hash(b) != f.ObjectID {
		return nil, fmt.Errorf("object integrity check failed: %s", f.ObjectID)
	}
	return b, nil
}
