package capture

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"agenttm/internal/events"
)

func TestChangedPathPreviewRetainsFullCount(t *testing.T) {
	e, session := setup(t)
	o := New(e, session, true)
	mustNotify(t, o, "many-files", "item.started")
	for i := 0; i < 205; i++ {
		path := filepath.Join(e.Root, fmt.Sprintf("added-%03d.txt", i))
		if err := os.WriteFile(path, []byte("captured"), 0600); err != nil {
			t.Fatal(err)
		}
	}
	mustNotify(t, o, "many-files", "item.completed")
	row := ops(t, e, session)[0]
	var preview []string
	if err := json.Unmarshal(row.ChangedPaths, &preview); err != nil {
		t.Fatal(err)
	}
	if len(preview) != 200 || row.ChangedPathCount != 205 || row.CaptureStatus != "complete" {
		t.Fatalf("path truncation lost full coverage count: %+v", row)
	}
	manifest, err := e.Load(row.After)
	if err != nil || len(manifest.Files) != 206 {
		t.Fatalf("preview limit incorrectly truncated captured files: %d, %v", len(manifest.Files), err)
	}
}

func TestPartialBeforeCaptureRemainsVisibleAfterOmissionDisappears(t *testing.T) {
	e, session := setup(t)
	path := filepath.Join(e.Root, ".env")
	if err := os.WriteFile(path, []byte("excluded demo data"), 0600); err != nil {
		t.Fatal(err)
	}
	o := New(e, session, true)
	mustNotify(t, o, "partial", "item.started")
	if err := os.Remove(path); err != nil {
		t.Fatal(err)
	}
	write(t, e, "changed")
	mustNotify(t, o, "partial", "item.completed")
	row := ops(t, e, session)[0]
	if row.CaptureStatus != "partial" {
		t.Fatalf("partial before capture was hidden: %+v", row)
	}
	before, err := e.Load(row.Before)
	if err != nil || !before.Partial || len(before.Omissions) == 0 {
		t.Fatalf("before omissions were lost: %+v, %v", before, err)
	}
	after, err := e.Load(row.After)
	if err != nil || after.Partial {
		t.Fatalf("unexpected after capture: %+v, %v", after, err)
	}
}

func TestTerminalStatusesRemainRecordedWithCaptureDisabled(t *testing.T) {
	e, session := setup(t)
	for _, status := range []string{"failed", "declined", "cancelled", "interrupted", "completed", "unknown"} {
		o := New(e, session, false)
		mustNotify(t, o, status, "item.started")
		payload := []byte(fmt.Sprintf(`{"item":{"status":%q}}`, status))
		if _, err := appendObservation(t, o, events.Record{Kind: "item.completed", Tool: "command_execution", Call: status, Payload: payload}); err != nil {
			t.Fatal(err)
		}
		rows := ops(t, e, session)
		row := rows[len(rows)-1]
		want := status
		if status == "unknown" {
			want = "completed"
		}
		if row.Status != want || row.CaptureStatus != "disabled" || row.Before != "" || row.After != "" {
			t.Fatalf("terminal status changed: %+v", row)
		}
		if err := o.Finish(); err != nil {
			t.Fatal(err)
		}
	}
}
