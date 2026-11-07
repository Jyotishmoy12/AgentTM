package cli

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"agenttm/internal/operation"
	"agenttm/internal/storage"
)

func TestHelpAndVersionDoNotRequireGit(t *testing.T) {
	t.Chdir(t.TempDir())
	for _, args := range [][]string{nil, {"help"}, {"--help"}, {"version"}} {
		var out, diagnostic bytes.Buffer
		if code := Run(context.Background(), args, &out, &diagnostic); code != 0 || out.Len() == 0 || diagnostic.Len() != 0 {
			t.Fatalf("standalone command failed: %v, %d, %s", args, code, diagnostic.String())
		}
	}
}

func TestCommandValidationDoesNotCreateSessionsOrHoldRecordingLock(t *testing.T) {
	root := initializeCLIProject(t)
	for _, args := range [][]string{
		{"unknown"}, {"init", "extra"}, {"events"}, {"operations"},
		{"events", "invalid", "extra"}, {"operations", "invalid", "extra"},
		{"run", "other"}, {"run", "codex", "--sandbox", "unsafe", "--", "task"},
		{"ui", "--port", "-1", "--no-browser"}, {"checkpoint"}, {"gc", "--min-age=-1h"},
	} {
		var out, diagnostic bytes.Buffer
		if code := Run(context.Background(), args, &out, &diagnostic); code != 2 || !strings.Contains(diagnostic.String(), "agenttm:") {
			t.Fatalf("command exit contract changed: %v, %d, %s", args, code, diagnostic.String())
		}
		unlock, err := operation.Acquire(root, "recording")
		if err != nil {
			t.Fatalf("validation left recording locked: %v", err)
		}
		unlock()
	}
	s, err := storage.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	defer s.DB.Close()
	if sessions, err := s.Sessions(); err != nil || len(sessions) != 0 {
		t.Fatalf("invalid commands created sessions: %v, %v", sessions, err)
	}
}

func TestCodexDoctorDoesNotOpenHistoryAndPreservesLoginErrors(t *testing.T) {
	installCLIChild(t)
	root := t.TempDir()
	t.Chdir(root)
	var out, diagnostic bytes.Buffer
	if code := Run(context.Background(), []string{"codex", "doctor"}, &out, &diagnostic); code != 0 || !strings.Contains(out.String(), "Codex login status: OK") {
		t.Fatalf("standalone Codex doctor failed: %d, %s", code, diagnostic.String())
	}
	t.Setenv("AGENTTM_CLI_TEST_LOGIN_ERROR", "1")
	if code := Run(context.Background(), []string{"codex", "doctor"}, &out, &diagnostic); code != 1 || !strings.Contains(diagnostic.String(), "run codex login") {
		t.Fatalf("login failure was hidden: %d, %s", code, diagnostic.String())
	}
	if _, err := os.Stat(filepath.Join(root, ".agenttm")); !os.IsNotExist(err) {
		t.Fatal("standalone diagnostics created history")
	}
}
