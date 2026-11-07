//go:build windows

package main

import (
	"context"
	"os/exec"
	"path/filepath"
	"time"

	"agenttm/internal/agents/codex"
	desktopproject "agenttm/internal/desktop"
	"agenttm/internal/process"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (d *Desktop) CheckSetup() SetupStatus {
	d.mu.Lock()
	defer d.mu.Unlock()
	status := SetupStatus{State: "missing", Project: filepath.Base(d.root), Path: d.root}
	if d.engine == nil {
		status.State = "project_required"
		return status
	}
	gitCheck, gitCancel := context.WithTimeout(d.ctx, 5*time.Second)
	status.Environment = desktopproject.CheckGitEnvironment(gitCheck, d.root)
	gitCancel()
	check, cancel := context.WithTimeout(d.ctx, 20*time.Second)
	defer cancel()
	executable := d.chat.ExecutablePath()
	if executable == "" {
		executable = "codex"
	}
	if _, err := exec.LookPath(executable); err != nil {
		return status
	}
	version, err := (codex.Adapter{Executable: executable}).Available(check)
	status.Version = version
	if err != nil {
		status.State = "incompatible"
		return status
	}
	login := exec.CommandContext(check, executable, "login", "status")
	process.HideWindow(login)
	if err = login.Run(); err != nil {
		status.State = "login_required"
		return status
	}
	status.State = "ready"
	return status
}

func (d *Desktop) CopyText(text string) error {
	return runtime.ClipboardSetText(d.ctx, text)
}

func (d *Desktop) OpenCodexDocs() {
	runtime.BrowserOpenURL(d.ctx, "https://developers.openai.com/codex/cli")
}
