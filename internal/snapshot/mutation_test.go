package snapshot

import (
	"os"
	"path/filepath"
	"testing"
)

func TestConcurrentMutationDetection(t *testing.T) {
	root := t.TempDir()
	write(t, root, "a", []byte("before"))
	p := filepath.Join(root, "a")
	before, err := os.Stat(p)
	if err != nil {
		t.Fatal(err)
	}
	if !consistentRead(before, before, before, 6) {
		t.Fatal("stable read rejected")
	}
	write(t, root, "a", []byte("changed size during read"))
	after, err := os.Stat(p)
	if err != nil {
		t.Fatal(err)
	}
	if consistentRead(before, after, after, after.Size()) {
		t.Fatal("concurrent size mutation missed")
	}
	write(t, root, "replacement", []byte("before"))
	replacement, err := os.Stat(filepath.Join(root, "replacement"))
	if err != nil {
		t.Fatal(err)
	}
	if consistentRead(before, before, replacement, 6) {
		t.Fatal("concurrent file replacement missed")
	}
	if consistentRead(before, before, before, 3) {
		t.Fatal("short read accepted")
	}
}
