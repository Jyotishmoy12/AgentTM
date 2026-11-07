package capture

import (
	"fmt"
	"testing"
)

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
