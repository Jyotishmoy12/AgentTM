package fork

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"agenttm/internal/operation"
)

func TestCancelledCreateReleasesLockWithoutCreatingDestination(t *testing.T) {
	s, _, m := setup(t, true)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := s.Create(ctx, m.ID, "cancelled", false); !errors.Is(err, context.Canceled) {
		t.Fatalf("expected cancellation, got %v", err)
	}
	for _, path := range []string{"data/maintenance.lock", "worktrees/cancelled"} {
		if _, err := os.Lstat(filepath.Join(s.Engine.Root, ".agenttm", filepath.FromSlash(path))); !os.IsNotExist(err) {
			t.Fatalf("unexpected retained path %s: %v", path, err)
		}
	}
	if _, err := s.Create(context.Background(), m.ID, "after-cancel", false); err != nil {
		t.Fatal(err)
	}
}

func TestCreateRespectsExistingMaintenanceLock(t *testing.T) {
	s, _, m := setup(t, true)
	release, err := operation.Acquire(s.Engine.Root, "maintenance")
	if err != nil {
		t.Fatal(err)
	}
	defer release()
	if _, err := s.Create(context.Background(), m.ID, "locked", false); !IsConflict(err) {
		t.Fatalf("expected lock conflict, got %v", err)
	}
	if _, err := os.Stat(filepath.Join(s.Engine.Root, ".agenttm", "data", "maintenance.lock")); err != nil {
		t.Fatalf("existing lock removed: %v", err)
	}
	var count int
	if err := s.Engine.Store.DB.QueryRow("SELECT count(*) FROM forks").Scan(&count); err != nil || count != 0 {
		t.Fatalf("blocked restore persisted a fork: %d, %v", count, err)
	}
}
