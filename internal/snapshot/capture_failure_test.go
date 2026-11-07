package snapshot

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCancelledCaptureReleasesLockWithoutPublishing(t *testing.T) {
	e, session := setup(t)
	write(t, e.Root, "a.txt", []byte("preserved"))
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := e.Capture(ctx, session, "baseline"); !errors.Is(err, context.Canceled) {
		t.Fatalf("expected cancellation, got %v", err)
	}
	if _, err := os.Lstat(filepath.Join(e.Root, ".agenttm", "data", "snapshot.lock")); !os.IsNotExist(err) {
		t.Fatalf("cancelled capture retained lock: %v", err)
	}
	list, err := e.List(session)
	if err != nil || len(list) != 0 {
		t.Fatalf("cancelled capture published checkpoint: %+v, %v", list, err)
	}
	if result := capture(t, e, session, "baseline"); !result.Created {
		t.Fatal("capture did not recover after cancellation")
	}
}

func TestObservationFailureRollsBackCheckpointPublication(t *testing.T) {
	e, session := setup(t)
	write(t, e.Root, "a.txt", []byte("historical content"))
	_, err := e.Store.DB.Exec(`CREATE TRIGGER fail_snapshot_event BEFORE INSERT ON events WHEN NEW.kind LIKE 'agenttm.snapshot.%' BEGIN SELECT RAISE(ABORT,'synthetic observation failure'); END`)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := e.Capture(context.Background(), session, "baseline"); err == nil {
		t.Fatal("observation persistence failure ignored")
	}
	list, err := e.List(session)
	if err != nil || len(list) != 0 {
		t.Fatalf("checkpoint published without observation: %+v, %v", list, err)
	}
	records, err := e.Store.Events(session, 0, 100)
	if err != nil || len(records) != 0 {
		t.Fatalf("failed transaction retained observation: %+v, %v", records, err)
	}
	report := e.Doctor()
	if len(report.Problems) != 0 || !strings.Contains(strings.Join(report.Warnings, "\n"), "unindexed manifest") {
		t.Fatalf("unpublished files were not retained for diagnosis: %+v", report)
	}
	if _, err := e.Store.DB.Exec("DROP TRIGGER fail_snapshot_event"); err != nil {
		t.Fatal(err)
	}
	capture(t, e, session, "baseline")
}
