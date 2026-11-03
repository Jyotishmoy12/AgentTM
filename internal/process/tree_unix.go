//go:build !windows

package process

import (
	"os"
	"os/exec"
	"syscall"
)

// Console window visibility is a Windows-specific concern.
func HideWindow(cmd *exec.Cmd) {}

func Configure(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error {
		e := syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		if e == syscall.ESRCH {
			return os.ErrProcessDone
		}
		return e
	}
}
