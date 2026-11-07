//go:build windows

package main

import (
	"fmt"
	"os"

	desktopproject "agenttm/internal/desktop"
	"agenttm/internal/interactive"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	windowoptions "github.com/wailsapp/wails/v2/pkg/options/windows"
)

func main() {
	handler := &desktopproject.Launcher{}
	desktop := &Desktop{chat: &interactive.Manager{}, launcher: handler}
	if len(os.Args) == 3 && os.Args[1] == "--project" {
		desktop.pendingProject = os.Args[2]
	}
	if directory, err := os.Getwd(); err == nil && desktop.pendingProject == "" {
		if engine, err := desktopproject.Open(directory, nil); err == nil && engine != nil {
			desktop.attach(engine)
		}
	}
	if path := savedCodexPath(); path != "" {
		_ = desktop.chat.SetExecutable(path)
	}

	err := wails.Run(&options.App{
		Title:                    "AgentTM",
		Width:                    1240,
		Height:                   800,
		DisableResize:            false,
		MinWidth:                 760,
		MinHeight:                550,
		AssetServer:              &assetserver.Options{Handler: handler},
		BackgroundColour:         &options.RGBA{R: 23, G: 24, B: 28, A: 1},
		OnStartup:                desktop.startup,
		OnDomReady:               desktop.domReady,
		OnShutdown:               desktop.shutdown,
		Bind:                     []interface{}{desktop},
		Windows:                  &windowoptions.Options{Theme: windowoptions.Dark, WebviewIsTransparent: false, WindowIsTranslucent: false},
		Frameless:                false,
		EnableDefaultContextMenu: false,
	})
	if err != nil {
		fatal(err)
	}
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, "agenttm desktop:", err)
	os.Exit(1)
}
