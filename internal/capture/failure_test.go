package capture

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"agenttm/internal/events"
)

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

func TestCompletionCaptureFailureKeepsBeforeCheckpoint(t *testing.T) {
	e, session := setup(t)
	o := New(e, session, true)
	mustNotify(t, o, "after-failure", "item.started")
	before := ops(t, e, session)[0].Before
	lock := filepath.Join(e.Root, ".agenttm", "data", "snapshot.lock")
	if err := os.WriteFile(lock, []byte("synthetic lock"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := notify(t, o, "after-failure", "item.completed"); err == nil {
		t.Fatal("completion capture failure hidden")
	}
	row := ops(t, e, session)[0]
	if row.Before != before || row.After != "" || row.CompletionEventID == "" || row.Status != "interrupted" || row.CaptureStatus != "failed" || !strings.Contains(row.Error, "after checkpoint capture failed") {
		t.Fatalf("failed completion lost its observed state: %+v", row)
	}
}

func TestFinishOnlyInterruptsItsOwnRun(t *testing.T) {
	e, session := setup(t)
	first, second := New(e, session, false), New(e, session, false)
	if first.RunID == "" || first.RunID == second.RunID {
		t.Fatal("observers share a local run identity")
	}
	mustNotify(t, first, "first", "item.started")
	mustNotify(t, second, "second", "item.started")
	if err := first.Finish(); err == nil {
		t.Fatal("unfinished operation was hidden")
	}
	rows := ops(t, e, session)
	if rows[0].Status != "interrupted" || rows[0].CaptureStatus != "disabled" || rows[1].Status != "running" {
		t.Fatalf("finish modified another run: %+v", rows)
	}
	if err := first.Finish(); err != nil {
		t.Fatalf("finish was not idempotent: %v", err)
	}
	if err := second.Finish(); err == nil {
		t.Fatal("second run's incomplete operation was hidden")
	}
}
