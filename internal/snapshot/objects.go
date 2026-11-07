package snapshot

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

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
