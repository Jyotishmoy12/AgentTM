package maintenance

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"agenttm/internal/config"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func TestPurgePreservesOtherSessionsAndBlobs(t *testing.T) {
	root := t.TempDir()
	if b, e := exec.Command("git", "init", root).CombinedOutput(); e != nil {
		t.Fatalf("%s %v", b, e)
	}
	if e := project.Init(root); e != nil {
		t.Fatal(e)
	}
	s, e := storage.Open(root)
	if e != nil {
		t.Fatal(e)
	}
	defer s.DB.Close()
	engine := snapshot.Engine{Root: root, Store: s, Config: config.Default()}
	os.WriteFile(filepath.Join(root, "a"), []byte("shared"), 0600)
	first, _ := s.Start()
	second, _ := s.Start()
	cp, e := engine.Capture(context.Background(), first, "baseline")
	if e != nil {
		t.Fatal(e)
	}
	if _, e = engine.Capture(context.Background(), second, "baseline"); e != nil {
		t.Fatal(e)
	}
	if _, e = Purge(root, s, first); e == nil {
		t.Fatal("active recording purged")
	}
	if e = s.Finish(first, "completed", 0); e != nil {
		t.Fatal(e)
	}
	r, e := Purge(root, s, first)
	if e != nil || r.Checkpoints != 1 || r.Events != 1 {
		t.Fatalf("%+v %v", r, e)
	}
	if _, e = engine.Load(cp.Manifest.ID); e == nil {
		t.Fatal("purged checkpoint still indexed")
	}
	if _, e = engine.ReadObject(cp.Manifest.Files[0]); e != nil {
		t.Fatal("shared blob deleted")
	}
	sessions, e := s.Sessions()
	if e != nil || len(sessions) != 1 || sessions[0].ID != second {
		t.Fatal("other session modified")
	}
	if _, e = engine.File(cp.Manifest.ID, "a"); e == nil {
		t.Fatal("purged history exposed")
	}
}
