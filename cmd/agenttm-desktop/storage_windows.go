//go:build windows

package main

import (
	"fmt"
	"time"

	"agenttm/internal/maintenance"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (d *Desktop) GarbageCollect(apply bool, token string) (maintenance.GCReport, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.engine == nil {
		return maintenance.GCReport{}, fmt.Errorf("open a Git project first")
	}
	return maintenance.Collect(d.engine, apply, token, 24*time.Hour)
}
func (d *Desktop) StorageUsage() (maintenance.Usage, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.engine == nil {
		return maintenance.Usage{}, fmt.Errorf("open a Git project first")
	}
	return maintenance.StorageUsage(d.engine.Root)
}
func (d *Desktop) CreateBackup(password string) (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.engine == nil {
		return "", fmt.Errorf("open a Git project first")
	}
	destination, err := runtime.SaveFileDialog(d.ctx, runtime.SaveDialogOptions{Title: "Save encrypted history backup", DefaultFilename: "agenttm-history.age", Filters: []runtime.FileFilter{{DisplayName: "Encrypted AgentTM backup", Pattern: "*.age"}}})
	if err != nil {
		return "", err
	}
	if destination == "" {
		return "", nil
	}
	if err = maintenance.Backup(d.ctx, d.engine, destination, password); err != nil {
		return "", err
	}
	return destination, nil
}
func (d *Desktop) RestoreHistory(password string) (string, error) {
	archive, err := runtime.OpenFileDialog(d.ctx, runtime.OpenDialogOptions{Title: "Choose encrypted AgentTM backup", Filters: []runtime.FileFilter{{DisplayName: "Encrypted AgentTM backup", Pattern: "*.age"}}})
	if err != nil {
		return "", err
	}
	if archive == "" {
		return "", nil
	}
	destination, err := runtime.OpenDirectoryDialog(d.ctx, runtime.OpenDialogOptions{Title: "Choose a Git clone with no .agenttm history"})
	if err != nil {
		return "", err
	}
	if destination == "" {
		return "", nil
	}
	answer, err := runtime.MessageDialog(d.ctx, runtime.MessageDialogOptions{Type: runtime.QuestionDialog, Title: "Restore encrypted history?", Message: "Restore AgentTM history into:\n" + destination + "\n\nThe destination must be a Git repository with no .agenttm directory. Project files and Git history are not included in this backup.", Buttons: []string{"Restore", "Cancel"}, DefaultButton: "Cancel", CancelButton: "Cancel"})
	if err != nil {
		return "", err
	}
	if answer != "Restore" {
		return "", nil
	}
	if err = maintenance.RestoreBackup(d.ctx, archive, destination, password); err != nil {
		return "", err
	}
	return destination, nil
}
