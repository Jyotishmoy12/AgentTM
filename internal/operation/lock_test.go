package operation

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAcquireRecordsOwnerAndReleaseAllowsReacquisition(t *testing.T) {
	root := lockRoot(t)
	path := filepath.Join(root, ".agenttm", "data", "recording.lock")
	release, err := Acquire(root, "recording")
	if err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(path)
	if err != nil || string(data) != fmt.Sprintf("pid=%d\n", os.Getpid()) {
		release()
		t.Fatalf("incorrect lock owner: %q, %v", data, err)
	}
	blocked, err := Acquire(root, "recording")
	if err == nil || blocked != nil || !strings.Contains(err.Error(), "recording is locked") {
		release()
		if blocked != nil {
			blocked()
		}
		t.Fatalf("duplicate acquisition accepted: %v", err)
	}
	after, err := os.ReadFile(path)
	if err != nil || string(after) != string(data) {
		release()
		t.Fatalf("failed acquisition modified lock: %q, %v", after, err)
	}
	release()
	if _, err := os.Lstat(path); !os.IsNotExist(err) {
		t.Fatalf("release retained lock: %v", err)
	}
	release, err = Acquire(root, "recording")
	if err != nil {
		t.Fatal(err)
	}
	release()
}

func TestConcurrentAcquisitionHasExactlyOneOwner(t *testing.T) {
	root := lockRoot(t)
	const workers = 24
	start := make(chan struct{})
	results := make(chan func(), workers)
	for i := 0; i < workers; i++ {
		go func() {
			<-start
			release, _ := Acquire(root, "snapshot")
			results <- release
		}()
	}
	close(start)
	var owners []func()
	for i := 0; i < workers; i++ {
		if release := <-results; release != nil {
			owners = append(owners, release)
		}
	}
	for _, release := range owners {
		release()
	}
	if len(owners) != 1 {
		t.Fatalf("expected one lock owner, got %d", len(owners))
	}
}

func TestDifferentOperationsHoldIndependentLocks(t *testing.T) {
	root := lockRoot(t)
	for _, name := range []string{"maintenance", "recording", "snapshot"} {
		release, err := Acquire(root, name)
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		t.Cleanup(release)
	}
}
