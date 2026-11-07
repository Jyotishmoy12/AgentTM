//go:build windows

package main

import (
	"context"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	desktopproject "agenttm/internal/desktop"
	"agenttm/internal/interactive"
	"agenttm/internal/project"
)

func desktopFixture(t *testing.T) *Desktop {
	t.Helper()
	root := t.TempDir()
	if _, err := project.Git(root, "init"); err != nil {
		t.Fatal(err)
	}
	if err := project.Init(root); err != nil {
		t.Fatal(err)
	}
	d := &Desktop{pendingProject: root, launcher: &desktopproject.Launcher{}, chat: &interactive.Manager{}}
	d.startup(context.Background())
	if opened, err := d.ChooseProject(); err != nil || !opened {
		t.Fatalf("open project: %v", err)
	}
	t.Cleanup(func() { d.shutdown(context.Background()) })
	return d
}

func TestDesktopAttachServesExistingDashboard(t *testing.T) {
	d := desktopFixture(t)
	response := httptest.NewRecorder()
	d.launcher.ServeHTTP(response, httptest.NewRequest("GET", "/api/health", nil))
	if response.Code != 200 {
		t.Fatalf("dashboard handler not attached: %d %s", response.Code, response.Body.String())
	}
	if path, err := d.ProjectPath(); err != nil || path != d.engine.Root {
		t.Fatalf("project bridge lost its root: %q, %v", path, err)
	}
}

func TestDesktopShutdownWithoutProject(t *testing.T) {
	d := &Desktop{chat: &interactive.Manager{}}
	d.startup(context.Background())
	d.domReady(d.ctx)
	d.shutdown(d.ctx)
	if d.ChatStatus().Running {
		t.Fatal("welcome window reported an active turn")
	}
}

func TestDesktopShutdownStopsChatBeforeClosingHistory(t *testing.T) {
	t.Setenv("AGENTTM_DESKTOP_TEST_CODEX", "1")
	d := desktopFixture(t)
	executable, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	if err = d.chat.SetExecutable(executable); err != nil {
		t.Fatal(err)
	}
	session, err := d.StartChat("", "synthetic desktop lifecycle test", "", "read-only")
	if err != nil {
		t.Fatal(err)
	}
	deadline := time.NewTimer(10 * time.Second)
	defer deadline.Stop()
	poll := time.NewTicker(10 * time.Millisecond)
	defer poll.Stop()
	for d.ChatStatus().Draft != "fixture active" {
		if state := d.ChatStatus(); !state.Running {
			t.Fatalf("chat stopped before shutdown: %s", state.Error)
		}
		select {
		case <-poll.C:
		case <-deadline.C:
			t.Fatal("synthetic turn never started")
		}
	}
	d.shutdown(d.ctx)
	if state := d.ChatStatus(); state.Running || state.Error != "" {
		t.Fatalf("shutdown did not finish cleanly: %+v", state)
	}
	if err := d.engine.Store.DB.Ping(); err == nil {
		t.Fatal("shutdown left history open")
	}
	engine, err := desktopproject.Open(d.root, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer engine.Store.DB.Close()
	var status string
	if err = engine.Store.DB.QueryRow("SELECT status FROM sessions WHERE id=?", session).Scan(&status); err != nil || status != "cancelled" {
		t.Fatalf("shutdown lost final session state: %q, %v", status, err)
	}
	var count int
	if err = engine.Store.DB.QueryRow("SELECT count(*) FROM events e JOIN checkpoints c ON c.id=e.checkpoint_id WHERE e.session_id=? AND e.kind='agenttm.snapshot.final'", session).Scan(&count); err != nil || count != 1 {
		t.Fatalf("shutdown lost final checkpoint: %d, %v", count, err)
	}
	if working, err := project.Git(d.root, "status", "--porcelain"); err != nil || strings.TrimSpace(working) != "" {
		t.Fatalf("lifecycle changed project files: %q, %v", working, err)
	}
}

func TestDesktopModelDiscoveryClosesItsClient(t *testing.T) {
	t.Setenv("AGENTTM_DESKTOP_TEST_CODEX", "1")
	d := desktopFixture(t)
	executable, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	if err = d.chat.SetExecutable(executable); err != nil {
		t.Fatal(err)
	}
	models, err := d.CodexModels()
	if err != nil || len(models) != 1 || models[0].Model != "desktop-test-model" {
		t.Fatalf("model discovery: %+v, %v", models, err)
	}
	if d.ChatStatus().Running {
		t.Fatal("model discovery started a conversation")
	}
}
