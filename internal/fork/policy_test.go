package fork

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestUnbornForkAndPartialPolicy(t *testing.T) {
	s, id, m := setup(t, false)
	result, e := s.Create(context.Background(), m.ID, "unborn", false)
	if e != nil {
		t.Fatal(e)
	}
	if result.BaseCommit != "" || len(result.Warnings) == 0 {
		t.Fatal("unborn base not explained")
	}
	b, e := os.ReadFile(filepath.Join(result.WorktreePath, "src", "a.txt"))
	if e != nil || string(b) != "dirty baseline\n" {
		t.Fatal("unborn restore failed")
	}
	put(t, s.Engine.Root, ".env", "PRIVATE=omitted\n")
	partial, e := s.Engine.Capture(context.Background(), id, "manual")
	if e != nil {
		t.Fatal(e)
	}
	if _, e = s.Create(context.Background(), partial.Manifest.ID, "partial", false); e == nil {
		t.Fatal("partial restore allowed implicitly")
	}
	result, e = s.Create(context.Background(), partial.Manifest.ID, "partial", true)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = os.Stat(filepath.Join(result.WorktreePath, ".env")); !os.IsNotExist(e) {
		t.Fatal("secret file materialized")
	}
}
