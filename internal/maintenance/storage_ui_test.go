package maintenance

import (
	"agenttm/internal/operation"
	"agenttm/internal/project"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestStorageUsageDisjointCategoriesAndExclusions(t *testing.T) {
	root := t.TempDir()
	base := filepath.Join(root, ".agenttm")
	if err := os.Mkdir(base, 0700); err != nil {
		t.Fatal(err)
	}
	report, err := StorageUsage(root)
	if err != nil || report.Total != 0 || report.MeasuredAt == "" {
		t.Fatalf("empty: %+v %v", report, err)
	}
	files := map[string]string{"objects/aa/blob": "1234567890", "data/events.db": "1234", "data/events.db-wal": "12", "data/events.db-shm": "123", "data/events.db-journal": "1", "manifests/capture.json": "12345", "logs/events.log": "123456", "config.json": "1234567", "data/recording.lock": "12", "worktrees/copy/large.txt": "this excluded workspace must not be counted"}
	for name, value := range files {
		path := filepath.Join(base, filepath.FromSlash(name))
		if err = os.MkdirAll(filepath.Dir(path), 0700); err != nil {
			t.Fatal(err)
		}
		if err = os.WriteFile(path, []byte(value), 0600); err != nil {
			t.Fatal(err)
		}
	}
	report, err = StorageUsage(root)
	if err != nil {
		t.Fatal(err)
	}
	if report.Blobs != 10 || report.Database != 10 || report.Manifests != 5 || report.Logs != 6 || report.Other != 9 || report.Total != 40 {
		t.Fatalf("double counted or misclassified: %+v", report)
	}
	if report.Total != report.Blobs+report.Database+report.Manifests+report.Logs+report.Other {
		t.Fatal("categories do not sum to total")
	}
	t.Run("unsafe link", func(t *testing.T) {
		outside := filepath.Join(t.TempDir(), "outside")
		if err := os.WriteFile(outside, []byte("do not follow"), 0600); err != nil {
			t.Fatal(err)
		}
		link := filepath.Join(base, "logs", "link")
		if err := os.Symlink(outside, link); err != nil {
			t.Skipf("symlinks unavailable: %v", err)
		}
		report, err := StorageUsage(root)
		if err == nil || report.Total != 0 {
			t.Fatal("partial measurement presented as complete")
		}
	})
}

func TestCleanupBlocksActiveRecordsAndEveryMaintenanceLock(t *testing.T) {
	e := historyFixture(t)
	empty, err := Collect(e, false, "", 24*time.Hour)
	if err != nil || empty.Candidates != 0 {
		t.Fatalf("empty cleanup: %+v %v", empty, err)
	}
	for _, name := range []string{"maintenance", "recording", "snapshot"} {
		t.Run(name, func(t *testing.T) {
			release, err := operation.Acquire(e.Root, name)
			if err != nil {
				t.Fatal(err)
			}
			defer release()
			if _, err = Collect(e, false, "", 24*time.Hour); err == nil {
				t.Fatal("locked cleanup was allowed")
			}
		})
	}
	session, err := e.Store.Start()
	if err != nil {
		t.Fatal(err)
	}
	if _, err = Collect(e, false, "", 24*time.Hour); err == nil {
		t.Fatal("active recording was ignored")
	}
	if err = e.Store.Finish(session, "completed", 0); err != nil {
		t.Fatal(err)
	}
	session, cp := captureFile(t, e, "recently unreferenced")
	if _, err = Purge(e.Root, e.Store, session); err != nil {
		t.Fatal(err)
	}
	recent, err := Collect(e, false, "", 24*time.Hour)
	if err != nil || recent.Candidates != 0 {
		t.Fatal("24-hour retention was not preserved")
	}
	if _, err = e.ReadObject(cp.Files[0]); err != nil {
		t.Fatal("recent blob removed")
	}
}

func TestRestoreMissingAndMalformedArchivesNeverPublishHistory(t *testing.T) {
	e := historyFixture(t)
	_, _ = captureFile(t, e, "source history")
	target := historyFixture(t).Root
	if err := RestoreBackup(context.Background(), filepath.Join(t.TempDir(), "missing.age"), target, "test passphrase"); err == nil {
		t.Fatal("existing history accepted")
	}
	clean := t.TempDir()
	if _, err := os.Stat(clean); err != nil {
		t.Fatal(err)
	}
	if output, err := project.Git(clean, "init"); err != nil {
		t.Fatalf("%s: %v", output, err)
	}
	for _, name := range []string{"missing.age", "corrupt.age"} {
		archive := filepath.Join(t.TempDir(), name)
		if name == "corrupt.age" {
			if err := os.WriteFile(archive, []byte("not an encrypted archive"), 0600); err != nil {
				t.Fatal(err)
			}
		}
		if err := RestoreBackup(context.Background(), archive, clean, "test passphrase"); err == nil {
			t.Fatal("bad archive accepted")
		}
		if _, err := os.Lstat(filepath.Join(clean, ".agenttm")); !os.IsNotExist(err) {
			t.Fatal("failed restore published history")
		}
	}
}

func TestCleanupStopsAtCorruptIndexedHistory(t *testing.T) {
	for _, kind := range []string{"manifest", "blob"} {
		t.Run(kind, func(t *testing.T) {
			e := historyFixture(t)
			_, cp := captureFile(t, e, "retained historical file")
			preview, err := Collect(e, false, "", 24*time.Hour)
			if err != nil {
				t.Fatal(err)
			}
			hash := strings.TrimPrefix(cp.Files[0].ObjectID, "sha256:")
			object := filepath.Join(e.Root, ".agenttm", "objects", hash[:2], hash)
			broken := object
			if kind == "manifest" {
				broken = filepath.Join(e.Root, ".agenttm", "manifests", cp.ID+".json")
			}
			if err = os.WriteFile(broken, []byte("deliberately corrupt fixture"), 0600); err != nil {
				t.Fatal(err)
			}
			if _, err = Collect(e, true, preview.Token, 24*time.Hour); err == nil {
				t.Fatal("corrupt indexed history did not block cleanup")
			}
			if _, err = os.Stat(object); err != nil {
				t.Fatal("retained object was deleted despite failed validation")
			}
		})
	}
}
