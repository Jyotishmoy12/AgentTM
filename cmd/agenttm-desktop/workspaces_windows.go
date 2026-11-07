//go:build windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	desktopproject "agenttm/internal/desktop"
)

func (d *Desktop) CheckRestoredWorkspace(id string) (desktopproject.FolderState, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.engine == nil {
		return desktopproject.FolderState{}, fmt.Errorf("open a Git project first")
	}
	return desktopproject.CheckRestoredFolder(d.engine.Store, d.engine.Root, id)
}
func (d *Desktop) OpenRestoredWorkspace(id string) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.engine == nil {
		return fmt.Errorf("open a Git project first")
	}
	folder, err := desktopproject.CheckRestoredFolder(d.engine.Store, d.engine.Root, id)
	if err != nil {
		return err
	}
	if folder.State != "available" {
		return fmt.Errorf("%s", folder.Message)
	}
	windowsDir := os.Getenv("SystemRoot")
	if windowsDir == "" || !filepath.IsAbs(windowsDir) {
		return fmt.Errorf("Windows File Explorer could not be located")
	}
	command := exec.Command(filepath.Join(windowsDir, "explorer.exe"), folder.Path)
	if err = command.Start(); err != nil {
		return fmt.Errorf("could not start Windows File Explorer: %w", err)
	}
	_ = command.Process.Release()
	return nil
}
