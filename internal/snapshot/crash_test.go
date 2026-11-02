package snapshot

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"agenttm/internal/operation"
)

func TestMain(m *testing.M) {
	if root := os.Getenv("AGENTTM_CRASH_STAGE_ROOT"); root != "" {
		release, err := operation.Acquire(root, "snapshot")
		if err != nil {
			os.Exit(2)
		}
		defer release()
		data := []byte("synthetic crash-recovery object")
		hash := Hash(data)
		if _, err = stageFile(filepath.Join(root, ".agenttm", "objects", hash[:2], hash), data); err != nil {
			os.Exit(3)
		}
		// At this exact production persistence boundary the object is synced but
		// unpublished. The parent force-kills this child, so deferred cleanup cannot run.
		fmt.Println("staged")
		time.Sleep(time.Hour)
		os.Exit(0)
	}
	os.Exit(m.Run())
}
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
