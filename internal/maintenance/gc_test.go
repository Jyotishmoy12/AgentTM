package maintenance

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"agenttm/internal/storage"
)

func TestGCSharedObjectsAndPreview(t *testing.T) {
	e := historyFixture(t)
	first, _ := captureFile(t, e, "shared")
	_, retained := captureFile(t, e, "shared")
	removedID, _ := captureFile(t, e, "orphan")
	if _, err := Purge(e.Root, e.Store, first); err != nil {
		t.Fatal(err)
	}
	if _, err := Purge(e.Root, e.Store, removedID); err != nil {
		t.Fatal(err)
	}
	report, err := Collect(e, false, "", 0)
	if err != nil || report.Candidates != 1 {
		t.Fatalf("%+v %v", report, err)
	}
	if _, err = Collect(e, true, "wrong-preview", 0); err == nil {
		t.Fatal("stale preview accepted")
	}
	report, err = Collect(e, true, report.Token, 0)
	if err != nil || report.Removed != 1 {
		t.Fatalf("%+v %v", report, err)
	}
	if _, err = e.ReadObject(retained.Files[0]); err != nil {
		t.Fatal("shared referenced blob removed", err)
	}
	if _, err = Collect(e, false, "", 24*time.Hour); err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(filepath.Join(e.Root, ".agenttm", "manifests", storage.ID()+".json"), []byte("{}"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err = Collect(e, false, "", 0); err == nil {
		t.Fatal("unindexed manifest ignored")
	}
}
