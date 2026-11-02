//go:build windows

// AgentTM Desktop is the native Windows shell. It reuses the production Go
// server and embedded React UI through Wails' WebView2 asset handler.
package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"agenttm/internal/agents/codex"
	"agenttm/internal/cli"
	"agenttm/internal/config"
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
	desktop := &Desktop{root: root}

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
	ctx  context.Context
	root string
	mu   sync.Mutex
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
	if _, err := exec.LookPath("codex"); err != nil {
		return status
	}
	version, err := (codex.Adapter{}).Available(check)
	status.Version = version
	if err != nil {
		status.State = "incompatible"
		return status
	}
	login := exec.CommandContext(check, "codex", "login", "status")
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
