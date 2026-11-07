//go:build windows

package process

import (
	"os"
	"os/exec"
	"strconv"
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
