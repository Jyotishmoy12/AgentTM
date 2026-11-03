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

func TestSequentialEditsAndNoOp(t *testing.T) {
	e, s := setup(t)
	o := New(e, s, true)
	for i, value := range []string{"one", "two", "two"} {
		item := fmt.Sprint(i)
		mustNotify(t, o, item, "item.started")
		write(t, e, value)
		mustNotify(t, o, item, "item.completed")
	}
	rows := ops(t, e, s)
	if len(rows) != 3 {
		t.Fatal(rows)
	}
	for i, value := range []string{"one", "two", "two"} {
		r := rows[i]
		if r.CaptureStatus != "complete" || r.Before == "" || r.After == "" {
			t.Fatal(r)
		}
		b, err := e.File(r.After, "code.txt")
		if err != nil || string(b) != value {
			t.Fatalf("%s %v", b, err)
		}
	}
	if rows[1].After == rows[2].After || rows[2].ChangedPathCount != 0 {
		t.Fatal("no-op boundary lost")
	}
	a, _ := e.Load(rows[1].After)
	b, _ := e.Load(rows[2].After)
	if a.Files[0].ObjectID != b.Files[0].ObjectID {
		t.Fatal("no-op blobs not deduplicated")
	}
	mustNotify(t, o, "2", "item.completed")
	if len(ops(t, e, s)) != 3 {
		t.Fatal("duplicate operation")
	}
	cps, _ := e.List(s)
	if len(cps) != 4 {
		t.Fatalf("unexpected checkpoints after duplicate: %d", len(cps))
	}
	if err := o.Finish(); err != nil {
		t.Fatal(err)
	}
	page, err := e.Store.Operations(s, rows[0].Cursor, 1)
	if err != nil || len(page) != 1 || page[0].ID != rows[1].ID {
		t.Fatal("pagination", err)
	}
	other := *e.Store
	other.ProjectID = "other"
	if _, err := other.Operations(s, 0, 10); err == nil {
		t.Fatal("cross-project access")
	}
}
func TestCoverageAndRepeatedItemIDs(t *testing.T) {
	e, s := setup(t)
	o := New(e, s, true)
	mustNotify(t, o, "a", "item.started")
	mustNotify(t, o, "b", "item.started")
	mustNotify(t, o, "a", "item.completed")
	mustNotify(t, o, "b", "item.completed")
	mustNotify(t, o, "missing", "item.completed")
	mustNotify(t, o, "interrupted", "item.started")
	if err := o.Finish(); err == nil {
		t.Fatal("missing completion hidden")
	}
	rows := ops(t, e, s)
	if !rows[0].Overlapping || !rows[1].Overlapping || !rows[2].MissingStart || rows[2].Before != "" || rows[2].CaptureStatus != "missing_start" || rows[3].CaptureStatus != "interrupted" {
		t.Fatal(rows)
	}
	next := New(e, s, true)
	mustNotify(t, next, "a", "item.started")
	mustNotify(t, next, "a", "item.completed")
	if len(ops(t, e, s)) != 5 {
		t.Fatal("item id reused across turns lost")
	}
	disabled := New(e, s, false)
	mustNotify(t, disabled, "off", "item.started")
	mustNotify(t, disabled, "off", "item.completed")
	rows = ops(t, e, s)
	if rows[5].CaptureStatus != "disabled" || rows[5].After != "" {
		t.Fatal(rows[5])
	}
}
func TestCaptureFailureIsRecorded(t *testing.T) {
	e, s := setup(t)
	o := New(e, s, true)
	lock := filepath.Join(e.Root, ".agenttm", "data", "snapshot.lock")
	if err := os.WriteFile(lock, []byte("test"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := notify(t, o, "locked", "item.started"); err == nil {
		t.Fatal("capture failure hidden")
	}
	rows := ops(t, e, s)
	if rows[0].CaptureStatus != "failed" || rows[0].Before != "" || rows[0].After != "" {
		t.Fatal(rows)
	}
}

func TestCancellationAndFailedTool(t *testing.T) {
	e, s := setup(t)
	o := New(e, s, true)
	mustNotify(t, o, "fail", "item.started")
	r := events.Normalize([]byte(`{"type":"item.completed","item":{"id":"fail","type":"command_execution","status":"failed","exit_code":1}}`), 65536, "")
	id, err := e.Store.AppendID(s, r.Kind, r.Tool, r.Call, r.Payload)
	if err != nil {
		t.Fatal(err)
	}
	if err = o.Observe(context.Background(), r, id); err != nil {
		t.Fatal(err)
	}
	if rows := ops(t, e, s); rows[0].Status != "failed" || rows[0].After == "" {
		t.Fatal(rows)
	}
	r = events.Normalize([]byte(`{"type":"item.started","item":{"id":"cancel","type":"file_change"}}`), 65536, "")
	id, err = e.Store.AppendID(s, r.Kind, r.Tool, r.Call, r.Payload)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err = o.Observe(ctx, r, id); err == nil {
		t.Fatal("cancelled capture succeeded")
	}
	if rows := ops(t, e, s); rows[1].CaptureStatus != "interrupted" {
		t.Fatal(rows[1])
	}
}
