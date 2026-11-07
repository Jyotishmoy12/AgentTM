//go:build windows

package process

import (
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
	"testing"
)

func TestConfigurePreservesHiddenWindowAttributes(t *testing.T) {
	cmd := exec.Command("unused")
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: syscall.CREATE_NEW_PROCESS_GROUP}
	attributes := cmd.SysProcAttr
	Configure(cmd)
	if cmd.Cancel == nil || cmd.SysProcAttr != attributes || !attributes.HideWindow || attributes.CreationFlags != syscall.CREATE_NEW_PROCESS_GROUP {
		t.Fatal("process configuration changed existing window attributes")
	}
}

func TestCancellationStopsWindowsDescendant(t *testing.T) {
	cmd, cancel, line := startProcessFixture(t, "tree")
	pid, err := strconv.Atoi(strings.TrimSpace(line))
	if err != nil || pid <= 0 {
		t.Fatalf("invalid descendant identity: %q, %v", line, err)
	}
	child, err := os.FindProcess(pid)
	if err != nil {
		t.Fatal(err)
	}
	defer child.Release()
	defer child.Kill()
	handle, err := syscall.OpenProcess(syscall.SYNCHRONIZE, false, uint32(pid))
	if err != nil {
		t.Fatal(err)
	}
	defer syscall.CloseHandle(handle)
	if state, err := syscall.WaitForSingleObject(handle, 0); err != nil || state != uint32(syscall.WAIT_TIMEOUT) {
		t.Fatalf("descendant was not running: %d, %v", state, err)
	}
	cancel()
	if err := cmd.Wait(); err == nil {
		t.Fatal("parent survived cancellation")
	}
	if state, err := syscall.WaitForSingleObject(handle, 3000); err != nil || state != syscall.WAIT_OBJECT_0 {
		t.Fatalf("descendant survived parent cancellation: %d, %v", state, err)
	}
}
