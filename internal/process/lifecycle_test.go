package process

import (
	"errors"
	"os"
	"testing"
)

func TestConfiguredProcessStopsOnContextCancellation(t *testing.T) {
	cmd, cancel, line := startProcessFixture(t, "ready")
	if line != "ready\n" {
		t.Fatalf("unexpected readiness: %q", line)
	}
	cancel()
	if err := cmd.Wait(); err == nil || cmd.ProcessState == nil || cmd.ProcessState.Success() {
		t.Fatalf("cancelled process did not terminate: %v", err)
	}
	if err := cmd.Cancel(); !errors.Is(err, os.ErrProcessDone) {
		t.Fatalf("finished process cancellation: %v", err)
	}
}
