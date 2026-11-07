//go:build !windows

package process

import (
	"os/exec"
	"syscall"
	"testing"
)

func TestConfigureCreatesProcessGroup(t *testing.T) {
	cmd := exec.Command("unused")
	Configure(cmd)
	if cmd.Cancel == nil || cmd.SysProcAttr == nil || !cmd.SysProcAttr.Setpgid {
		t.Fatal("process group cancellation was not configured")
	}
}

func TestHideWindowDoesNotChangeUnixAttributes(t *testing.T) {
	cmd := exec.Command("unused")
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	attributes := cmd.SysProcAttr
	HideWindow(cmd)
	if cmd.SysProcAttr != attributes || !attributes.Setpgid {
		t.Fatal("window helper changed Unix process attributes")
	}
}
