package snapshot

import (
	"bufio"
	"context"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"
)

func TestDoctorAfterForceKillDuringPersistence(t *testing.T) {
	e, _ := setup(t)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	child := exec.CommandContext(ctx, os.Args[0])
	child.Env = append(os.Environ(), "AGENTTM_CRASH_STAGE_ROOT="+e.Root)
	stdout, err := child.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	if err = child.Start(); err != nil {
		t.Fatal(err)
	}
	defer func() { _ = child.Process.Kill(); _ = child.Wait() }()
	ready, err := bufio.NewReader(stdout).ReadString('\n')
	if err != nil || strings.TrimSpace(ready) != "staged" {
		t.Fatalf("child did not stage an object: %q %v", ready, err)
	}
	if err = child.Process.Kill(); err != nil {
		t.Fatal(err)
	}
	_ = child.Wait()
	report := e.Doctor()
	if len(report.Problems) != 0 {
		t.Fatalf("interrupted unpublished object marked corrupt: %+v", report)
	}
	warnings := strings.Join(report.Warnings, "\n")
	if !strings.Contains(warnings, "temporary file") || !strings.Contains(warnings, "snapshot.lock") {
		t.Fatalf("crash was not diagnosed: %+v", report)
	}
}
