package capture

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"agenttm/internal/config"
	"agenttm/internal/events"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func setup(t *testing.T) (*snapshot.Engine, string) {
	t.Helper()
	root := t.TempDir()
	if b, err := exec.Command("git", "init", root).CombinedOutput(); err != nil {
		t.Fatalf("%s: %v", b, err)
	}
	if err := project.Init(root); err != nil {
		t.Fatal(err)
	}
	s, err := storage.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.DB.Close() })
	id, err := s.Start()
	if err != nil {
		t.Fatal(err)
	}
	e := &snapshot.Engine{Root: root, Store: s, Config: config.Default()}
	write(t, e, "zero")
	if _, err = e.Capture(context.Background(), id, "baseline"); err != nil {
		t.Fatal(err)
	}
	return e, id
}
func write(t *testing.T, e *snapshot.Engine, value string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(e.Root, "code.txt"), []byte(value), 0600); err != nil {
		t.Fatal(err)
	}
}
func notify(t *testing.T, o *Observer, item, kind string) error {
	t.Helper()
	r := events.Normalize([]byte(fmt.Sprintf(`{"type":%q,"item":{"id":%q,"type":"command_execution","status":"completed"}}`, kind, item)), 65536, "")
	id, err := o.Engine.Store.AppendID(o.Session, r.Kind, r.Tool, r.Call, r.Payload)
	if err != nil {
		t.Fatal(err)
	}
	return o.Observe(context.Background(), r, id)
}
func mustNotify(t *testing.T, o *Observer, item, kind string) {
	t.Helper()
	if err := notify(t, o, item, kind); err != nil {
		t.Fatal(err)
	}
}
func ops(t *testing.T, e *snapshot.Engine, s string) []storage.Operation {
	t.Helper()
	v, err := e.Store.Operations(s, 0, 100)
	if err != nil {
		t.Fatal(err)
	}
	return v
}

func appendObservation(t *testing.T, o *Observer, record events.Record) (string, error) {
	t.Helper()
	id, err := o.Engine.Store.AppendID(o.Session, record.Kind, record.Tool, record.Call, record.Payload)
	if err != nil {
		t.Fatal(err)
	}
	return id, o.Observe(context.Background(), record, id)
}
