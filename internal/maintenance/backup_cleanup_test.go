package maintenance

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"agenttm/internal/operation"
)

func TestCancelledBackupRemovesStagingAndReleasesLocks(t *testing.T) {
	e := historyFixture(t)
	_, _ = captureFile(t, e, "preserved history")
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	archive := filepath.Join(t.TempDir(), "cancelled.age")
	if err := Backup(ctx, e, archive, "a long test passphrase"); !errors.Is(err, context.Canceled) {
		t.Fatalf("expected cancellation, got %v", err)
	}
	if _, err := os.Lstat(archive); !os.IsNotExist(err) {
		t.Fatalf("cancelled archive retained: %v", err)
	}
	stages, err := filepath.Glob(filepath.Join(e.Root, ".agenttm", "data", ".backup-*"))
	if err != nil || len(stages) != 0 {
		t.Fatalf("backup staging retained: %+v, %v", stages, err)
	}
	for _, name := range []string{"maintenance", "recording", "snapshot"} {
		release, err := operation.Acquire(e.Root, name)
		if err != nil {
			t.Fatalf("backup retained %s lock: %v", name, err)
		}
		release()
	}
}

func TestQuiesceDatabaseFailureReleasesAllAcquiredLocks(t *testing.T) {
	e := historyFixture(t)
	if err := e.Store.DB.Close(); err != nil {
		t.Fatal(err)
	}
	if release, err := Quiesce(e.Root, e.Store); err == nil || release != nil {
		t.Fatalf("closed database allowed maintenance: %v", err)
	}
	for _, name := range []string{"maintenance", "recording", "snapshot"} {
		release, err := operation.Acquire(e.Root, name)
		if err != nil {
			t.Fatalf("failed maintenance retained %s lock: %v", name, err)
		}
		release()
	}
}
