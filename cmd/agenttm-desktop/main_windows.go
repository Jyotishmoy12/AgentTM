//go:build windows

// AgentTM Desktop is the native Windows shell. It reuses the production Go
// server and embedded React UI through Wails' WebView2 asset handler.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"agenttm/internal/agents/codex"
	"agenttm/internal/cli"
	"agenttm/internal/config"
	"agenttm/internal/interactive"
	"agenttm/internal/maintenance"
	"agenttm/internal/process"
	"agenttm/internal/project"
	"agenttm/internal/server"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	windowoptions "github.com/wailsapp/wails/v2/pkg/options/windows"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func main() {
	root, err := project.Root(mustWorkingDirectory())
	if err != nil {
		fatal(err)
	}
	configPath := root + string(os.PathSeparator) + ".agenttm" + string(os.PathSeparator) + "config.json"
	c, err := config.Load(configPath)
	if err != nil {
		fatal(fmt.Errorf("cannot load AgentTM config; run agenttm init first: %w", err))
	}
	s, err := storage.Open(root)
	if err != nil {
		fatal(err)
	}
	defer s.DB.Close()
	engine := &snapshot.Engine{Root: root, Store: s, Config: c}
	handler := server.NewDesktop(engine, cli.Version)
	desktop := &Desktop{root: root, chat: &interactive.Manager{Engine: engine}, engine: engine}
	if path := savedCodexPath(); path != "" {
		_ = desktop.chat.SetExecutable(path)
	}

	err = wails.Run(&options.App{
		Title:                    "AgentTM",
		Width:                    1100,
		Height:                   740,
		DisableResize:            false,
		MinWidth:                 760,
		MinHeight:                550,
		AssetServer:              &assetserver.Options{Handler: handler},
		BackgroundColour:         &options.RGBA{R: 10, G: 16, B: 24, A: 1},
		OnStartup:                func(ctx context.Context) { desktop.ctx = ctx },
		OnShutdown:               func(context.Context) { desktop.chat.Shutdown() },
		Bind:                     []interface{}{desktop},
		Windows:                  &windowoptions.Options{WebviewIsTransparent: false, WindowIsTranslucent: false},
		Frameless:                false,
		EnableDefaultContextMenu: false,
	})
	if err != nil {
		fatal(err)
	}
}

func mustWorkingDirectory() string {
	dir, err := os.Getwd()
	if err != nil {
		fatal(err)
	}
	return dir
}

type Desktop struct {
	ctx    context.Context
	root   string
	mu     sync.Mutex
	chat   *interactive.Manager
	engine *snapshot.Engine
}

func (d *Desktop) ChatStatus() interactive.State { return d.chat.Status() }
func (d *Desktop) CodexModels() ([]interactive.Model, error) {
	return interactive.ListModels(d.ctx, d.chat.ExecutablePath(), d.root)
}

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

// The user chooses this file through the native picker; it is never downloaded
// or searched for in project content. Chat, models and diagnostics share it.
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
func (d *Desktop) StartChat(session, prompt, model, sandbox string) (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.chat.Start(d.ctx, session, prompt, model, sandbox)
}
func (d *Desktop) StopChat()                              { d.chat.Stop() }
func (d *Desktop) DecideChat(id string, allow bool) error { return d.chat.Decide(id, allow) }
func (d *Desktop) GarbageCollect(apply bool, token string) (maintenance.GCReport, error) {
	return maintenance.Collect(d.engine, apply, token, 24*time.Hour)
}
func (d *Desktop) CreateBackup(password string) (string, error) {
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

type SetupStatus struct {
	State   string `json:"state"`
	Version string `json:"version"`
	Project string `json:"project"`
	Path    string `json:"path"`
}

// CheckSetup runs diagnostics only. Credentials and diagnostic output never
// cross the native bridge; the UI receives only readiness and version.
func (d *Desktop) CheckSetup() SetupStatus {
	d.mu.Lock()
	defer d.mu.Unlock()
	status := SetupStatus{State: "missing", Project: filepath.Base(d.root), Path: d.root}
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

func fatal(err error) {
	fmt.Fprintln(os.Stderr, "agenttm desktop:", err)
	os.Exit(1)
}
