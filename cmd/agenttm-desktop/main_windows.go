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
	desktopproject "agenttm/internal/desktop"
	"agenttm/internal/interactive"
	"agenttm/internal/maintenance"
	"agenttm/internal/process"
	"agenttm/internal/project"
	"agenttm/internal/server"
	"agenttm/internal/snapshot"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	windowoptions "github.com/wailsapp/wails/v2/pkg/options/windows"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func main() {
	handler := &desktopproject.Launcher{}
	desktop := &Desktop{chat: &interactive.Manager{}, launcher: handler}
	// A project chosen in another window must survive the child process launch,
	// including when it still needs explicit history initialization.
	if len(os.Args) == 3 && os.Args[1] == "--project" {
		desktop.pendingProject = os.Args[2]
	}
	// Keep initialized-project launches, without implicitly initializing Explorer's cwd.
	if directory, err := os.Getwd(); err == nil && desktop.pendingProject == "" {
		if engine, err := desktopproject.Open(directory, nil); err == nil && engine != nil {
			desktop.attach(engine)
		}
	}
	if path := savedCodexPath(); path != "" {
		_ = desktop.chat.SetExecutable(path)
	}

	err := wails.Run(&options.App{
		Title:            "AgentTM",
		Width:            1240,
		Height:           800,
		DisableResize:    false,
		MinWidth:         760,
		MinHeight:        550,
		AssetServer:      &assetserver.Options{Handler: handler},
		BackgroundColour: &options.RGBA{R: 23, G: 24, B: 28, A: 1},
		OnStartup:        func(ctx context.Context) { desktop.ctx = ctx },
		OnDomReady: func(ctx context.Context) {
			desktop.mu.Lock()
			pending := desktop.pendingProject != ""
			desktop.mu.Unlock()
			if !pending {
				return
			}
			opened, openErr := desktop.ChooseProject()
			if openErr != nil {
				_, _ = runtime.MessageDialog(ctx, runtime.MessageDialogOptions{Type: runtime.ErrorDialog, Title: "Could not open project", Message: openErr.Error()})
			} else if opened {
				runtime.WindowReload(ctx)
			}
		},
		OnShutdown: func(context.Context) {
			desktop.mu.Lock()
			defer desktop.mu.Unlock()
			desktop.chat.Shutdown()
			if desktop.engine != nil {
				desktop.engine.Store.DB.Close()
			}
		},
		Bind:                     []interface{}{desktop},
		Windows:                  &windowoptions.Options{Theme: windowoptions.Dark, WebviewIsTransparent: false, WindowIsTranslucent: false},
		Frameless:                false,
		EnableDefaultContextMenu: false,
	})
	if err != nil {
		fatal(err)
	}
}

type Desktop struct {
	ctx            context.Context
	root           string
	mu             sync.Mutex
	chat           *interactive.Manager
	engine         *snapshot.Engine
	launcher       *desktopproject.Launcher
	pendingProject string
}

// Called only before startup or under mu. An open project is never replaced.
func (d *Desktop) attach(engine *snapshot.Engine) {
	d.root = engine.Root
	d.engine = engine
	d.chat.Engine = engine
	d.launcher.Set(server.NewDesktop(engine, cli.Version))
}

func (d *Desktop) ChooseProject() (bool, error) {
	return d.chooseProject(func() (string, error) {
		return runtime.OpenDirectoryDialog(d.ctx, runtime.OpenDialogOptions{Title: "Choose an existing Git project"})
	}, func(root string) (bool, error) {
		answer, err := runtime.MessageDialog(d.ctx, runtime.MessageDialogOptions{
			Type: runtime.QuestionDialog, Title: "Initialize AgentTM history?",
			Message: "Create local AgentTM history in:\n" + root + "\n\nThis creates .agenttm and adds it to the local Git exclusion file. It does not create a commit or change your tracked files.",
			Buttons: []string{"Initialize", "Cancel"}, DefaultButton: "Cancel", CancelButton: "Cancel",
		})
		return answer == "Initialize", err
	})
}

func (d *Desktop) chooseProject(pick func() (string, error), confirm func(string) (bool, error)) (bool, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.engine != nil {
		return false, fmt.Errorf("a project is already open; close and reopen AgentTM to choose another")
	}
	directory := d.pendingProject
	d.pendingProject = ""
	var err error
	if directory == "" {
		directory, err = pick()
	}
	if err != nil || directory == "" {
		return false, err
	}
	engine, err := desktopproject.Open(directory, confirm)
	if err != nil || engine == nil {
		return false, err
	}
	d.attach(engine)
	return true, nil
}

// ProjectPath reads the already opened project without probing Codex or Git.
func (d *Desktop) ProjectPath() (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.engine == nil {
		return "", fmt.Errorf("open a Git project first")
	}
	return d.root, nil
}

func projectWindowCommand(executable, root string) *exec.Cmd {
	command := exec.Command(executable, "--project", root)
	command.Dir = root
	// This is an interactive GUI application, not a background console helper.
	// SW_HIDE suppresses Wails' initial ShowWindow call on Windows.
	return command
}

// OpenProjectWindow keeps the current engine and recording attached to this
// window. Initialization, if needed, remains an explicit action in the new one.
func (d *Desktop) OpenProjectWindow() (bool, error) {
	directory, err := runtime.OpenDirectoryDialog(d.ctx, runtime.OpenDialogOptions{Title: "Open a Git project in another AgentTM window"})
	if err != nil || directory == "" {
		return false, err
	}
	root, err := project.Root(directory)
	if err != nil {
		return false, fmt.Errorf("choose an existing Git working tree: %w", err)
	}
	executable, err := os.Executable()
	if err != nil {
		return false, err
	}
	command := projectWindowCommand(executable, root)
	if err = command.Start(); err != nil {
		return false, err
	}
	_ = command.Process.Release()
	return true, nil
}

func (d *Desktop) ChatStatus() interactive.State { return d.chat.Status() }

// These methods accept project-scoped restore IDs, never caller-supplied paths.
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
	// Use a fixed system executable with a single path argument; no shell or code runs.
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
func (d *Desktop) CodexModels() ([]interactive.Model, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.engine == nil {
		return nil, fmt.Errorf("open a Git project first")
	}
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
	if d.engine == nil {
		return "", fmt.Errorf("open a Git project first")
	}
	return d.chat.Start(d.ctx, session, prompt, model, sandbox)
}
func (d *Desktop) StopChat()                              { d.chat.Stop() }
func (d *Desktop) DecideChat(id string, allow bool) error { return d.chat.Decide(id, allow) }
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

type SetupStatus struct {
	State       string                        `json:"state"`
	Version     string                        `json:"version"`
	Project     string                        `json:"project"`
	Path        string                        `json:"path"`
	Environment desktopproject.GitEnvironment `json:"environment"`
}

// CheckSetup runs diagnostics only. Credentials and diagnostic output never
// cross the native bridge; the UI receives only readiness and version.
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

func fatal(err error) {
	fmt.Fprintln(os.Stderr, "agenttm desktop:", err)
	os.Exit(1)
}
