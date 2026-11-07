//go:build windows

package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"agenttm/internal/interactive"
)

func TestDesktopBridgeKeepsPublicMethods(t *testing.T) {
	want := []string{
		"ChatStatus", "CheckRestoredWorkspace", "CheckSetup", "ChooseCodex",
		"ChooseProject", "CodexModels", "CopyText", "CreateBackup", "DecideChat",
		"GarbageCollect", "OpenCodexDocs", "OpenProjectWindow", "OpenRestoredWorkspace",
		"ProjectPath", "RestoreHistory", "StartChat", "StopChat", "StorageUsage",
	}
	bridge := reflect.TypeOf(&Desktop{})
	if bridge.NumMethod() != len(want) {
		t.Fatalf("Wails bridge changed: got %d methods, want %d", bridge.NumMethod(), len(want))
	}
	for _, name := range want {
		if _, ok := bridge.MethodByName(name); !ok {
			t.Errorf("missing Wails method %s", name)
		}
	}
}

func TestDesktopWelcomeGuardsProjectActions(t *testing.T) {
	d := &Desktop{chat: &interactive.Manager{}}
	checks := map[string]func() error{
		"path":            func() error { _, err := d.ProjectPath(); return err },
		"chat":            func() error { _, err := d.StartChat("", "hello", "", "read-only"); return err },
		"models":          func() error { _, err := d.CodexModels(); return err },
		"cleanup":         func() error { _, err := d.GarbageCollect(false, ""); return err },
		"usage":           func() error { _, err := d.StorageUsage(); return err },
		"backup":          func() error { _, err := d.CreateBackup("unused"); return err },
		"restore details": func() error { _, err := d.CheckRestoredWorkspace("unused"); return err },
		"restore folder":  func() error { return d.OpenRestoredWorkspace("unused") },
	}
	for name, check := range checks {
		t.Run(name, func(t *testing.T) {
			if err := check(); err == nil || err.Error() != "open a Git project first" {
				t.Fatalf("missing project guard: %v", err)
			}
		})
	}
	data, err := json.Marshal(d.CheckSetup())
	if err != nil {
		t.Fatal(err)
	}
	var status map[string]json.RawMessage
	if err = json.Unmarshal(data, &status); err != nil || string(status["state"]) != `"project_required"` {
		t.Fatalf("setup bridge payload changed: %s, %v", data, err)
	}
	for _, field := range []string{"state", "version", "project", "path", "environment"} {
		if _, ok := status[field]; !ok {
			t.Errorf("setup bridge lost %s", field)
		}
	}
}

func TestDesktopSourceFilesStayWithinLineLimit(t *testing.T) {
	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatal(err)
	}
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		lines := strings.Count(strings.TrimSuffix(string(data), "\n"), "\n") + 1
		if lines > 200 {
			t.Errorf("%s has %d lines; the desktop package limit is 200", file, lines)
		}
	}
}
