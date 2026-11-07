package operation

import (
	"bufio"
	"bytes"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

func TestForceKilledProcessRetainsLockForDiagnosis(t *testing.T) {
	root := lockRoot(t)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, os.Args[0])
	cmd.Env = append(os.Environ(), "AGENTTM_OPERATION_LOCK_ROOT="+root)
	input, err := cmd.StdinPipe()
	if err != nil {
		t.Fatal(err)
	}
	defer input.Close()
	output, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	waited := false
	defer func() {
		if !waited {
			_ = cmd.Process.Kill()
			_ = cmd.Wait()
		}
	}()
	line, err := bufio.NewReader(output).ReadString('\n')
	if err != nil || line != "locked\n" {
		t.Fatalf("child did not acquire lock: %q, %v", line, err)
	}
	path := filepath.Join(root, ".agenttm", "data", "maintenance.lock")
	before, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := cmd.Process.Kill(); err != nil {
		t.Fatal(err)
	}
	err = cmd.Wait()
	waited = true
	if err == nil || ctx.Err() != nil {
		t.Fatalf("expected explicit process kill, got %v, context %v", err, ctx.Err())
	}
	if release, err := Acquire(root, "maintenance"); err == nil || release != nil {
		t.Fatalf("lock silently recovered after process kill: %v", err)
	}
	after, err := os.ReadFile(path)
	if err != nil || !bytes.Equal(before, after) {
		t.Fatalf("crash lock altered: %q, %v", after, err)
	}
}
