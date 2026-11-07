package snapshot

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDirtyWorkspaceAndHistory(t *testing.T) {
	e, id := setup(t)
	root := e.Root
	write(t, root, "tracked.txt", []byte("staged\n"))
	git(t, root, "add", "tracked.txt")
	write(t, root, "tracked.txt", []byte("dirty\n"))
	write(t, root, "untracked.txt", []byte("same\n"))
	write(t, root, "duplicate.txt", []byte("same\n"))
	write(t, root, ".gitignore", []byte("ignored.txt\ntracked.txt\n"))
	write(t, root, "ignored.txt", []byte("not eligible"))
	write(t, root, "tracked-deleted.txt", []byte("gone"))
	git(t, root, "add", "tracked-deleted.txt")
	os.Remove(filepath.Join(root, "tracked-deleted.txt"))
	index, _ := os.ReadFile(filepath.Join(root, ".git", "index"))
	head, _ := os.ReadFile(filepath.Join(root, ".git", "HEAD"))
	before := git(t, root, "status", "--porcelain=v1", "-z")
	a := capture(t, e, id, "baseline")
	if !a.Created || a.Manifest.Partial || len(a.Manifest.Files) != 4 {
		t.Fatalf("unexpected baseline: %+v", a.Manifest)
	}
	if find(t, a.Manifest, "duplicate.txt").ObjectID != find(t, a.Manifest, "untracked.txt").ObjectID {
		t.Fatal("content not deduplicated")
	}
	b, err := e.File(a.Manifest.ID, "tracked.txt")
	if err != nil || string(b) != "dirty\n" {
		t.Fatalf("dirty content: %s %v", b, err)
	}
	if _, err = e.File(a.Manifest.ID, "ignored.txt"); err == nil {
		t.Fatal("ignored file captured")
	}
	same := capture(t, e, id, "final")
	if same.Created || same.Manifest.ID != a.Manifest.ID {
		t.Fatal("unchanged checkpoint not reused")
	}
	write(t, root, "tracked.txt", []byte("changed\n"))
	os.Remove(filepath.Join(root, "untracked.txt"))
	write(t, root, "added.bin", []byte{0, 1, 2})
	c := capture(t, e, id, "manual")
	if !c.Created || c.Manifest.ParentID != a.Manifest.ID {
		t.Fatal("bad parent chain")
	}
	diff, err := e.Diff(c.Manifest.ID)
	if err != nil {
		t.Fatal(err)
	}
	changes := map[string]Change{}
	for _, v := range diff {
		changes[v.Path] = v
	}
	if len(changes) != 3 || changes["added.bin"].Kind != "added" || !changes["added.bin"].Binary || changes["untracked.txt"].Kind != "removed" || !strings.Contains(changes["tracked.txt"].Patch, "-dirty\n+changed\n") {
		t.Fatalf("bad diff: %+v", diff)
	}
	b, err = e.File(a.Manifest.ID, "tracked.txt")
	if err != nil || string(b) != "dirty\n" {
		t.Fatal("historical contents changed")
	}
	current := git(t, root, "status", "--porcelain=v1", "-z")
	capture(t, e, id, "manual")
	if !bytes.Equal(current, git(t, root, "status", "--porcelain=v1", "-z")) {
		t.Fatal("capture modified workspace")
	}
	after, _ := os.ReadFile(filepath.Join(root, ".git", "index"))
	if !bytes.Equal(index, after) {
		t.Fatal("capture modified index")
	}
	after, _ = os.ReadFile(filepath.Join(root, ".git", "HEAD"))
	if !bytes.Equal(head, after) {
		t.Fatal("capture modified HEAD")
	}
	if bytes.Equal(before, current) {
		t.Fatal("test failed to mutate fixture")
	}
	events, err := e.Store.Events(id, 0, 100)
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 4 || events[1].CheckpointID != a.Manifest.ID || events[2].CheckpointID != c.Manifest.ID {
		t.Fatalf("bad checkpoint event linkage: %+v", events)
	}
	report := e.Doctor()
	if len(report.Problems) > 0 || len(report.Warnings) > 0 || report.Checkpoints != 2 {
		t.Fatalf("doctor: %+v", report)
	}
}
