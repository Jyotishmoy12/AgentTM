//go:build windows

package process

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"syscall"
	"testing"
	"time"
)

func TestHiddenWindowPreservesProcessAttributes(t *testing.T) {
	cmd := exec.Command("unused")
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: syscall.CREATE_NEW_PROCESS_GROUP}
	attributes := cmd.SysProcAttr
	HideWindow(cmd)
	if cmd.SysProcAttr != attributes || !attributes.HideWindow || attributes.CreationFlags != syscall.CREATE_NEW_PROCESS_GROUP {
		t.Fatal("hiding a window changed existing process attributes")
	}
}

func TestBackgroundConsoleAndDescendantStayHidden(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, os.Args[0], "-test.run=^TestConsoleWindowHelper$")
	cmd.Env = append(os.Environ(), "AGENTTM_CONSOLE_TEST=parent")
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x00000010}
	HideWindow(cmd)
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("background console regression: %s: %v", output, err)
	}
}

func TestConsoleWindowHelper(t *testing.T) {
	mode := os.Getenv("AGENTTM_CONSOLE_TEST")
	if mode == "" {
		return
	}
	console, _, _ := syscall.NewLazyDLL("kernel32.dll").NewProc("GetConsoleWindow").Call()
	visible, _, _ := syscall.NewLazyDLL("user32.dll").NewProc("IsWindowVisible").Call(console)
	if console == 0 || visible != 0 {
		fmt.Fprintln(os.Stderr, "expected an allocated hidden console")
		os.Exit(2)
	}
	if mode == "parent" {
		child := exec.Command(os.Args[0], "-test.run=^TestConsoleWindowHelper$")
		child.Env = append(os.Environ(), "AGENTTM_CONSOLE_TEST=descendant")
		if output, err := child.CombinedOutput(); err != nil {
			fmt.Fprintf(os.Stderr, "descendant: %s: %v", output, err)
			os.Exit(3)
		}
	}
	os.Exit(0)
}
