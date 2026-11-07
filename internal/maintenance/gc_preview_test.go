package maintenance

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"agenttm/internal/snapshot"
)

func TestCleanupPreviewRejectsChangedCandidateSet(t *testing.T) {
	e := historyFixture(t)
	session, manifest := captureFile(t, e, "orphan")
	if _, err := Purge(e.Root, e.Store, session); err != nil {
		t.Fatal(err)
	}
	preview, err := Collect(e, false, "", 0)
	if err != nil || preview.Candidates != 1 {
		t.Fatalf("invalid initial preview: %+v, %v", preview, err)
	}
	hash := strings.TrimPrefix(manifest.Files[0].ObjectID, "sha256:")
	object := filepath.Join(e.Root, ".agenttm", "objects", hash[:2], hash)
	if err := os.WriteFile(object, []byte("candidate changed since preview"), 0600); err != nil {
		t.Fatal(err)
	}
	result, err := Collect(e, true, preview.Token, 0)
	if err == nil || result.Removed != 0 {
		t.Fatalf("stale preview deleted candidate: %+v, %v", result, err)
	}
	if _, err := os.Stat(object); err != nil {
		t.Fatalf("changed candidate removed: %v", err)
	}
}

func TestCleanupRefusesUnexpectedObjectPathsAndNegativeAge(t *testing.T) {
	e := historyFixture(t)
	if _, err := Collect(e, false, "", -1); err == nil {
		t.Fatal("negative retention accepted")
	}
	hash := snapshot.Hash([]byte("unused"))
	object := filepath.Join(e.Root, ".agenttm", "objects", hash)
	if err := os.WriteFile(object, []byte("unused"), 0600); err != nil {
		t.Fatal(err)
	}
	if result, err := Collect(e, false, "", 0); err == nil || result.Removed != 0 {
		t.Fatalf("noncanonical object accepted: %+v, %v", result, err)
	}
	if _, err := os.Stat(object); err != nil {
		t.Fatalf("unexpected object deleted: %v", err)
	}
}
