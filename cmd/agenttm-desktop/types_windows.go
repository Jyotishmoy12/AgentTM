//go:build windows

package main

import (
	"context"
	"sync"

	desktopproject "agenttm/internal/desktop"
	"agenttm/internal/interactive"
	"agenttm/internal/snapshot"
)

type Desktop struct {
	ctx            context.Context
	root           string
	mu             sync.Mutex
	chat           *interactive.Manager
	engine         *snapshot.Engine
	launcher       *desktopproject.Launcher
	pendingProject string
}

type SetupStatus struct {
	State       string                        `json:"state"`
	Version     string                        `json:"version"`
	Project     string                        `json:"project"`
	Path        string                        `json:"path"`
	Environment desktopproject.GitEnvironment `json:"environment"`
}
