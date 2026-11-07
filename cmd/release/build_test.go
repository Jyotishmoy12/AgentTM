package main

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestReleaseBuildCommands(t *testing.T) {
	b := releaseBuilder{root: t.TempDir(), options: releaseOptions{version: "1.2.3-rc.1"}, commit: "abc-dirty", date: "2026-11-06T00:00:00Z"}
	output := filepath.Join(t.TempDir(), "path with spaces", "agenttm.exe")
	target, err := parseReleaseTarget("windows/arm64")
	if err != nil {
		t.Fatal(err)
	}
	cli := b.cliBuildCommand(target, output)
	flags := "-s -w -X agenttm/internal/cli.Version=1.2.3-rc.1 -X agenttm/internal/cli.Commit=abc-dirty -X agenttm/internal/cli.BuildDate=2026-11-06T00:00:00Z"
	want := []string{"build", "-trimpath", "-ldflags", flags, "-o", output, "./cmd/agenttm"}
	if !reflect.DeepEqual(cli.Args[1:], want) || cli.Dir != b.root || cli.Stdout != os.Stdout || cli.Stderr != os.Stderr {
		t.Fatalf("CLI build command changed: %+v", cli)
	}
	for _, entry := range []string{"GOOS=windows", "GOARCH=arm64", "CGO_ENABLED=0"} {
		found := false
		for _, value := range cli.Env {
			found = found || value == entry
		}
		if !found {
			t.Errorf("missing build environment %s", entry)
		}
	}
	desktop := b.desktopBuildCommand(output)
	want = []string{"build", "-trimpath", "-tags", "production", "-ldflags", "-H windowsgui " + flags, "-o", output, "./cmd/agenttm-desktop"}
	if !reflect.DeepEqual(desktop.Args[1:], want) || desktop.Dir != b.root {
		t.Fatalf("desktop build command changed: %+v", desktop)
	}
}

func TestReleaseMissingDocuments(t *testing.T) {
	root := t.TempDir()
	paths := []string{"internal/server/ui/third-party-notices.txt", "LICENSE", "NOTICE", "docs/fork-and-recovery.md"}
	wantErrors := []string{"build the frontend first", "release license is required", "release ownership notice is required", "fork-and-recovery.md"}
	for i, path := range paths {
		b := releaseBuilder{root: root, options: releaseOptions{version: "1.2.3"}}
		if err := b.loadDocuments(); err == nil || !strings.Contains(err.Error(), wantErrors[i]) {
			t.Fatalf("missing %s accepted: %v", path, err)
		}
		full := filepath.Join(root, filepath.FromSlash(path))
		if err := os.MkdirAll(filepath.Dir(full), 0700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(full, []byte(path), 0600); err != nil {
			t.Fatal(err)
		}
	}
	b := releaseBuilder{root: root, options: releaseOptions{version: "1.2.3"}}
	if err := b.loadDocuments(); err != nil {
		t.Fatal(err)
	}
	files := b.archiveFiles("agenttm", []byte("binary"), b.documents.readme)
	if len(files) != 6 || string(files["LICENSE"]) != "LICENSE" || string(files["NOTICE"]) != "NOTICE" || !strings.Contains(string(files["README.md"]), "AgentTM 1.2.3") {
		t.Fatalf("release documents lost: %v", files)
	}
}
