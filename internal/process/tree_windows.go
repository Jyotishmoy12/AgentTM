//go:build windows

package process

import (
	"os"
	"os/exec"
	"strconv"
	"syscall"
)

func Configure(cmd *exec.Cmd) {
	HideWindow(cmd)
	cmd.Cancel = func() error {
		kill := exec.Command("taskkill", "/PID", strconv.Itoa(cmd.Process.Pid), "/T", "/F")
		HideWindow(kill)
		e := kill.Run()
		if e != nil {
			if k := cmd.Process.Kill(); k != nil {
				return os.ErrProcessDone
			}
		}
		return nil
	}
}

// HideWindow keeps background console applications hidden when launched from
// the native GUI. Retain the hidden console so their console children inherit
// it instead of allocating a visible console of their own.
func HideWindow(cmd *exec.Cmd) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.HideWindow = true
}
