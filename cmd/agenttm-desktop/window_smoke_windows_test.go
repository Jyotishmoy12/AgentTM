//go:build windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"
	"testing"
	"time"

	"agenttm/internal/process"
	"agenttm/internal/project"

	"golang.org/x/sys/windows"
)

func TestNativeProjectWindowVisible(t *testing.T) {
	binary := os.Getenv("AGENTTM_DESKTOP_SMOKE_BINARY")
	if binary == "" {
		t.Skip("set AGENTTM_DESKTOP_SMOKE_BINARY to test a real desktop window")
	}
	if !filepath.IsAbs(binary) {
		t.Fatal("desktop smoke binary must be an absolute path")
	}
	root := t.TempDir()
	if _, err := project.Git(root, "init"); err != nil {
		t.Fatal(err)
	}
	if err := project.Init(root); err != nil {
		t.Fatal(err)
	}
	cmd := projectWindowCommand(binary, root)
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	post := windows.NewLazySystemDLL("user32.dll").NewProc("PostMessageW")
	var handle windows.HWND
	defer func() {
		if handle != 0 {
			_, _, _ = post.Call(uintptr(handle), 0x0010, 0, 0)
		}
		select {
		case <-done:
		case <-time.After(5 * time.Second):
			kill := exec.Command("taskkill", "/PID", strconv.Itoa(cmd.Process.Pid), "/T", "/F")
			process.HideWindow(kill)
			_ = kill.Run()
			select {
			case <-done:
			case <-time.After(5 * time.Second):
				t.Error("test window did not exit")
			}
		}
	}()
	callback := syscall.NewCallback(func(hwnd uintptr, _ uintptr) uintptr {
		var pid uint32
		_, _ = windows.GetWindowThreadProcessId(windows.HWND(hwnd), &pid)
		if pid == uint32(cmd.Process.Pid) && windows.IsWindowVisible(windows.HWND(hwnd)) {
			handle = windows.HWND(hwnd)
		}
		return 1
	})
	deadline := time.Now().Add(20 * time.Second)
	for time.Now().Before(deadline) {
		_ = windows.EnumWindows(callback, nil)
		if handle != 0 {
			t.Logf("visible native project window: PID %d, HWND %s", cmd.Process.Pid, fmt.Sprintf("0x%x", handle))
			return
		}
		select {
		case err := <-done:
			done <- err
			t.Fatalf("desktop exited before displaying its window: %v", err)
		default:
		}
		time.Sleep(150 * time.Millisecond)
	}
	t.Fatal("desktop process started but no visible top-level window appeared")
}
