package snapshot

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestIntegrityAndInterruptedWrites(t *testing.T) {
	e, id := setup(t)
	write(t, e.Root, "a", []byte("contents"))
	m := capture(t, e, id, "baseline").Manifest
	f := m.Files[0]
	p, _ := e.objectPath(f.ObjectID)
	if err := os.WriteFile(p, []byte("corrupt!"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := e.File(m.ID, "a"); err == nil {
		t.Fatal("corrupt blob read")
	}
	if len(e.Doctor().Problems) == 0 {
		t.Fatal("doctor missed corrupt blob")
	}
	os.Remove(p)
	if len(e.Doctor().Problems) == 0 {
		t.Fatal("doctor missed missing blob")
	}
	write(t, e.Root, ".agenttm/objects/.tmp-interrupted", []byte("incomplete"))
	write(t, e.Root, ".agenttm/manifests/abandoned.json", []byte("{}"))
	orphan := []byte("orphan")
	if _, err := e.put(orphan); err != nil {
		t.Fatal(err)
	}
	lock := filepath.Join(e.Root, ".agenttm", "data", "snapshot.lock")
	os.WriteFile(lock, []byte(id), 0600)
	if _, err := e.Capture(context.Background(), id, "manual"); err == nil {
		t.Fatal("capture ignored lock")
	}
	report := e.Doctor()
	if len(report.Warnings) < 4 {
		t.Fatalf("recovery warnings missing: %+v", report)
	}
	os.Remove(lock)
	if _, err := e.put([]byte("contents")); err != nil {
		t.Fatal(err)
	}
	manifestPath := filepath.Join(e.Root, ".agenttm", "manifests", m.ID+".json")
	if err := os.WriteFile(manifestPath, []byte(`{}`), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := e.Load(m.ID); err == nil {
		t.Fatal("manifest corruption accepted")
	}
}
