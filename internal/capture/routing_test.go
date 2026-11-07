package capture

import (
	"context"
	"strings"
	"testing"

	"agenttm/internal/events"
)

func TestObserverRejectsInvalidEventsAndToolReuse(t *testing.T) {
	e, session := setup(t)
	o := New(e, session, false)
	for _, record := range []events.Record{
		{Kind: "item.started", Tool: "unsupported"},
		{Kind: "item.updated", Tool: "command_execution"},
	} {
		if err := o.Observe(context.Background(), record, "not-a-uuid"); err != nil {
			t.Fatalf("irrelevant notification was not ignored: %v", err)
		}
	}
	if err := o.Observe(context.Background(), events.Record{Kind: "item.started", Tool: "command_execution"}, "not-a-uuid"); err == nil {
		t.Fatal("supported operation accepted an invalid event UUID")
	}
	if len(ops(t, e, session)) != 0 {
		t.Fatal("invalid notifications wrote operations")
	}
	mustNotify(t, o, "same-item", "item.started")
	record := events.Record{Kind: "item.completed", Tool: "file_change", Call: "same-item", Payload: []byte(`{}`)}
	if _, err := appendObservation(t, o, record); err == nil || !strings.Contains(err.Error(), "different tool") {
		t.Fatalf("item ID reused across tools: %v", err)
	}
	row := ops(t, e, session)[0]
	if row.Tool != "command_execution" || row.Status != "running" || row.CompletionEventID != "" {
		t.Fatalf("rejected reuse modified the original operation: %+v", row)
	}
}

func TestTurnAndMissingItemIdentityArePreserved(t *testing.T) {
	e, session := setup(t)
	o := New(e, session, false)
	for _, payload := range []string{`{"turn_id":"recorded-turn"}`, `{}`, `not-json`} {
		if _, err := appendObservation(t, o, events.Record{Kind: "turn.started", Payload: []byte(payload)}); err != nil {
			t.Fatal(err)
		}
	}
	for i := 0; i < 2; i++ {
		id, err := appendObservation(t, o, events.Record{Kind: "item.completed", Tool: "command_execution", Payload: []byte(`{}`)})
		if err != nil {
			t.Fatal(err)
		}
		row := ops(t, e, session)[i]
		if row.ItemID != "missing-id:"+id || row.TurnID != "recorded-turn" || !row.MissingStart || row.Before != "" || row.After != "" || row.CaptureStatus != "disabled" {
			t.Fatalf("missing identity or disabled capture semantics changed: %+v", row)
		}
	}
}

func TestDuplicateNotificationsReuseCheckpointLinks(t *testing.T) {
	e, session := setup(t)
	o := New(e, session, true)
	mustNotify(t, o, "edit", "item.started")
	before := ops(t, e, session)[0].Before
	start := events.Record{Kind: "item.started", Tool: "command_execution", Call: "edit", Payload: []byte(`{}`)}
	id, err := appendObservation(t, o, start)
	if err != nil {
		t.Fatal(err)
	}
	var linked string
	if err = e.Store.DB.QueryRow("SELECT checkpoint_id FROM events WHERE id=?", id).Scan(&linked); err != nil || linked != before {
		t.Fatalf("duplicate start lost its checkpoint link: %q, %v", linked, err)
	}
	write(t, e, "changed")
	mustNotify(t, o, "edit", "item.completed")
	original := ops(t, e, session)[0]
	checkpoints, err := e.List(session)
	if err != nil {
		t.Fatal(err)
	}
	completion := events.Record{Kind: "item.completed", Tool: "command_execution", Call: "edit", Payload: []byte(`{}`)}
	id, err = appendObservation(t, o, completion)
	if err != nil {
		t.Fatal(err)
	}
	if err = e.Store.DB.QueryRow("SELECT checkpoint_id FROM events WHERE id=?", id).Scan(&linked); err != nil || linked != original.After {
		t.Fatalf("duplicate completion lost its checkpoint link: %q, %v", linked, err)
	}
	if row := ops(t, e, session)[0]; row.CompletionEventID != original.CompletionEventID || row.After != original.After {
		t.Fatalf("duplicate completion rewrote operation: %+v", row)
	}
	if after, err := e.List(session); err != nil || len(after) != len(checkpoints) {
		t.Fatalf("duplicate notification captured another state: %v", err)
	}
}
