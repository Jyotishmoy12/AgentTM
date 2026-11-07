package operation

import (
	"os"
	"path/filepath"
	"testing"
)

func lockRoot(t *testing.T) string {
	t.Helper()
	root, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(root, ".agenttm", "data"), 0700); err != nil {
		t.Fatal(err)
	}
	return root
}
