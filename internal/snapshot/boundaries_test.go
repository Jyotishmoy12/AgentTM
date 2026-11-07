package snapshot

import (
	"context"
	"encoding/json"
	"testing"
)

func TestNoOpOperationCompletionCreatesDistinctCheckpoint(t *testing.T) {
	e, session := setup(t)
	write(t, e.Root, "a.txt", []byte("unchanged contents"))
	baseline := capture(t, e, session, "baseline")
	start, err := e.Store.AppendID(session, "item.started", "command_execution", "operation", []byte(`{}`))
	if err != nil {
		t.Fatal(err)
	}
	before, err := e.CaptureBoundary(context.Background(), session, start, "operation_before")
	if err != nil || before.Created || before.Manifest.ID != baseline.Manifest.ID {
		t.Fatalf("unchanged before-boundary not reused: %+v, %v", before, err)
	}
	completed, err := e.Store.AppendID(session, "item.completed", "command_execution", "operation", []byte(`{}`))
	if err != nil {
		t.Fatal(err)
	}
	after, err := e.CaptureBoundary(context.Background(), session, completed, "operation_after")
	if err != nil || !after.Created || after.Manifest.ID == baseline.Manifest.ID || after.Manifest.ParentID != baseline.Manifest.ID {
		t.Fatalf("no-op completion lost distinct checkpoint: %+v, %v", after, err)
	}
	if after.Manifest.ObservedEventID != completed || after.Manifest.Files[0].ObjectID != baseline.Manifest.Files[0].ObjectID {
		t.Fatal("completion identity or blob deduplication changed")
	}
	records, err := e.Store.Events(session, 0, 100)
	if err != nil {
		t.Fatal(err)
	}
	for _, event := range records {
		if event.ID == completed && event.CheckpointID != after.Manifest.ID {
			t.Fatal("completed event not linked to its checkpoint")
		}
		if event.Kind == "agenttm.snapshot.operation_after" {
			var metadata struct {
				Created bool `json:"created"`
				Changed bool `json:"state_changed"`
			}
			if err := json.Unmarshal(event.Payload, &metadata); err != nil || !metadata.Created || metadata.Changed {
				t.Fatalf("no-op metadata incorrect: %s, %v", event.Payload, err)
			}
		}
	}
	if report := e.Doctor(); report.Checkpoints != 2 || report.Objects != 1 || len(report.Problems) != 0 {
		t.Fatalf("invalid no-op checkpoint storage: %+v", report)
	}
}

func TestBoundaryRejectsMismatchedEventWithoutCapturing(t *testing.T) {
	e, session := setup(t)
	event, err := e.Store.AppendID(session, "item.started", "command_execution", "operation", []byte(`{}`))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := e.CaptureBoundary(context.Background(), session, event, "operation_after"); err == nil {
		t.Fatal("start event accepted as completion")
	}
	if _, err := e.CaptureBoundary(context.Background(), session, event, "unsupported"); err == nil {
		t.Fatal("unsupported boundary accepted")
	}
	list, err := e.List(session)
	if err != nil || len(list) != 0 {
		t.Fatalf("rejected boundary created a checkpoint: %+v, %v", list, err)
	}
}
