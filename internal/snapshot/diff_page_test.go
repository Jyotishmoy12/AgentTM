package snapshot

import (
	"os"
	"testing"
)

func TestDiffPageReadsOnlyRequestedObjects(t *testing.T) {
	e, session := setup(t)
	for _, name := range []string{"a.txt", "b.txt", "c.txt"} {
		write(t, e.Root, name, []byte(name))
	}
	m := capture(t, e, session, "baseline").Manifest
	object, err := e.objectPath(find(t, m, "c.txt").ObjectID)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(object, []byte("corrupted"), 0600); err != nil {
		t.Fatal(err)
	}
	page, total, err := e.DiffPage(m.ID, 0, 1)
	if err != nil || total != 3 || len(page) != 1 || page[0].Path != "a.txt" {
		t.Fatalf("unrequested corrupt object broke first page: %+v, %d, %v", page, total, err)
	}
	if _, _, err := e.DiffPage(m.ID, 2, 1); err == nil {
		t.Fatal("requested corrupt object was accepted")
	}
	page, total, err = e.DiffPage(m.ID, 100, 1)
	if err != nil || total != 3 || len(page) != 0 {
		t.Fatalf("past-end page read objects: %+v, %d, %v", page, total, err)
	}
}
