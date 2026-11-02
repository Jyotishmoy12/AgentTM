package snapshot

import (
	"context"
	"testing"
)

func TestCompletedToolObservationLinksCheckpoint(t *testing.T) {
	e, id := setup(t)
	write(t, e.Root, "a", []byte("baseline"))
	baseline := capture(t, e, id, "baseline")
	event, err := e.Store.AppendID(id, "item.completed", "command_execution", "item_1", []byte(`{"source":"synthetic-test"}`))
	if err != nil {
		t.Fatal(err)
	}
	write(t, e.Root, "a", []byte("observed mutation"))
	result, err := e.CaptureNear(context.Background(), id, event)
	if err != nil {
		t.Fatal(err)
	}
	if !result.Created || result.Manifest.Kind != "observed" || result.Manifest.ObservedEventID != event || result.Manifest.ParentID != baseline.Manifest.ID {
		t.Fatal("observation metadata missing")
	}
	records, err := e.Store.Events(id, 0, 100)
	if err != nil {
		t.Fatal(err)
	}
	if records[1].CheckpointID != result.Manifest.ID || records[2].Kind != "agenttm.snapshot.observed" {
		t.Fatal("tool checkpoint not linked atomically")
	}
	bad, err := e.Store.AppendID(id, "item.started", "command_execution", "item_2", []byte(`{}`))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = e.CaptureNear(context.Background(), id, bad); err == nil {
		t.Fatal("incomplete tool event accepted")
	}
}
