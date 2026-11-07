//go:build windows

package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"agenttm/internal/agents/codex"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func codexPreferenceFile() (string, error) {
	directory, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(directory, "AgentTM", "desktop.json"), nil
}
func savedCodexPath() string {
	file, err := codexPreferenceFile()
	if err != nil {
		return ""
	}
	b, err := os.ReadFile(file)
	if err != nil || len(b) > 16384 {
		return ""
	}
	var preference struct {
		Codex string `json:"codex_executable"`
	}
	if json.Unmarshal(b, &preference) != nil {
		return ""
	}
	return preference.Codex
}

func (d *Desktop) ChooseCodex() (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.chat.Status().Running {
		return "", fmt.Errorf("stop the current turn before changing Codex")
	}
	chosen, err := runtime.OpenFileDialog(d.ctx, runtime.OpenDialogOptions{Title: "Select your installed Codex CLI (codex.exe)", Filters: []runtime.FileFilter{{DisplayName: "Codex CLI executable", Pattern: "codex.exe"}}})
	if err != nil || chosen == "" {
		return "", err
	}
	if !strings.EqualFold(filepath.Base(chosen), "codex.exe") {
		return "", fmt.Errorf("select the installed codex.exe executable")
	}
	if _, err = (codex.Adapter{Executable: chosen}).Available(d.ctx); err != nil {
		return "", err
	}
	file, err := codexPreferenceFile()
	if err != nil {
		return "", err
	}
	if err = os.MkdirAll(filepath.Dir(file), 0700); err != nil {
		return "", err
	}
	data, _ := json.Marshal(map[string]string{"codex_executable": chosen})
	if err = os.WriteFile(file, data, 0600); err != nil {
		return "", err
	}
	if err = d.chat.SetExecutable(chosen); err != nil {
		return "", err
	}
	return chosen, nil
}
