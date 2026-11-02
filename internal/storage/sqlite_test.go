package storage

import (
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"testing"

	"agenttm/internal/project"
)

func TestStore(t *testing.T) {
	root := t.TempDir()
	if b, e := exec.Command("git", "init", root).CombinedOutput(); e != nil {
		t.Fatalf("%s %v", b, e)
	}
	if e := project.Init(root); e != nil {
		t.Fatal(e)
	}
	s, e := Open(root)
	if e != nil {
		t.Fatal(e)
	}
	defer s.DB.Close()
	id, e := s.Start()
	if e != nil {
		t.Fatal(e)
	}
	var wg sync.WaitGroup
	s2, e := Open(root)
	if e != nil {
		t.Fatal(e)
	}
	defer s2.DB.Close()
	for i := 0; i < 40; i++ {
		wg.Add(1)
		writer := s
		if i%2 == 0 {
			writer = s2
		}
		go func(writer *Store) {
			defer wg.Done()
			if e := writer.Append(id, "test", "", "", []byte(`{}`)); e != nil {
				t.Error(e)
			}
		}(writer)
	}
	wg.Wait()
	ev, e := s.Events(id, 0, 100)
	if e != nil || len(ev) != 40 {
		t.Fatalf("events %d %v", len(ev), e)
	}
	for i, v := range ev {
		if v.Sequence != int64(i+1) {
			t.Fatal("non-monotonic sequence")
		}
	}
	page, e := s.Events(id, 20, 5)
	if e != nil || len(page) != 5 || page[0].Sequence != 21 {
		t.Fatalf("bad pagination %v", e)
	}
	if e = s.Finish(id, "failed", 7); e != nil {
		t.Fatal(e)
	}
	sessions, e := s.Sessions()
	if e != nil || len(sessions) != 1 || sessions[0].Status != "failed" || sessions[0].ExitCode.Int64 != 7 {
		t.Fatalf("%+v %v", sessions, e)
	}
	if _, e = s.Events("foreign", 0, 10); e == nil {
		t.Fatal("foreign session accepted")
	}
	if _, e = s.Events(id, 0, 1001); e == nil {
		t.Fatal("unbounded query accepted")
	}
	var check string
	if e = s.DB.QueryRow("PRAGMA integrity_check").Scan(&check); e != nil || check != "ok" {
		t.Fatalf("integrity %s %v", check, e)
	}
	if _, e = s.DB.Exec("INSERT INTO events(id,session_id,sequence,kind,received_at,payload_json) VALUES ('orphan','missing',1,'test','now','{}')"); e == nil {
		t.Fatal("foreign keys disabled")
	}
	// Reopening an initialized database must preserve data.
	s.DB.Close()
	s, e = Open(root)
	if e != nil {
		t.Fatal(e)
	}
	defer s.DB.Close()
	ev, e = s.Events(id, 0, 100)
	if e != nil || len(ev) != 40 {
		t.Fatalf("reopen lost events: %v", e)
	}
	if _, e = os.Stat(filepath.Join(root, ".agenttm", "data", "events.db")); e != nil {
		t.Fatal(e)
	}
}
