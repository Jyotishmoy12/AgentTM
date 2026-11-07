package fork

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"agenttm/internal/storage"
)

func TestRejectedInputsAndMissingObjects(t *testing.T) {
	s, _, m := setup(t, true)
	for _, name := range []string{"../escape", "/absolute", "has space", "UPPER", "con", "-option", "a/b", ""} {
		if _, e := s.Preview(context.Background(), m.ID, name); e == nil {
			t.Errorf("accepted name %q", name)
		}
	}
	if _, e := s.Preview(context.Background(), storage.ID(), "valid"); e == nil {
		t.Fatal("foreign checkpoint accepted")
	}
	hash := strings.TrimPrefix(m.Files[0].ObjectID, "sha256:")
	os.Remove(filepath.Join(s.Engine.Root, ".agenttm", "objects", hash[:2], hash))
	if _, e := s.Create(context.Background(), m.ID, "damaged", false); e == nil {
		t.Fatal("missing object restore accepted")
	}
	if _, e := os.Stat(filepath.Join(s.Engine.Root, ".agenttm", "worktrees", "damaged")); !os.IsNotExist(e) {
		t.Fatal("destination created before validation")
	}
}

func TestRejectSymlinkDestination(t *testing.T) {
	s, _, m := setup(t, true)
	outside := t.TempDir()
	p := filepath.Join(s.Engine.Root, ".agenttm", "worktrees")
	if e := os.Symlink(outside, p); e != nil {
		t.Skip("symlinks unavailable:", e)
	}
	if _, e := s.Create(context.Background(), m.ID, "escape", false); e == nil {
		t.Fatal("symlink escape accepted")
	}
	files, e := os.ReadDir(outside)
	if e != nil || len(files) != 0 {
		t.Fatal("outside path modified")
	}
}
