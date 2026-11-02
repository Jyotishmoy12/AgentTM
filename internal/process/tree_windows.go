//go:build windows

package process

import (
	"os"
	"os/exec"
	"strconv"
)

func Configure(cmd *exec.Cmd) {
	cmd.Cancel = func() error {
		e := exec.Command("taskkill", "/PID", strconv.Itoa(cmd.Process.Pid), "/T", "/F").Run()
		if e != nil {
			if k := cmd.Process.Kill(); k != nil {
				return os.ErrProcessDone
			}
		}
		return nil
	}
}
