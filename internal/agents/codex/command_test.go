package codex

import (
	"context"
	"io"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"agenttm/internal/events"
)

func TestCommandPreservesArgumentsAndPrivateStdin(t *testing.T) {
	task := "private prompt; do not put this in arguments"
	executable := filepath.Join(t.TempDir(), "codex executable")
	for _, sandbox := range []string{"", "read-only", "workspace-write"} {
		a := Adapter{Executable: executable, Model: "test-model", Sandbox: sandbox}
		root := t.TempDir()
		cmd, err := a.command(context.Background(), root, task)
		if err != nil {
			t.Fatal(err)
		}
		want := []string{executable, "exec", "--json", "--model", "test-model"}
		if sandbox != "" {
			want = append(want, "--sandbox", sandbox)
		}
		want = append(want, "-")
		if !reflect.DeepEqual(cmd.Args, want) || cmd.Dir != root || cmd.Path != executable {
			t.Fatalf("command contract changed: %+v", cmd)
		}
		input, err := io.ReadAll(cmd.Stdin)
		if err != nil || string(input) != task || strings.Contains(strings.Join(cmd.Args, " "), task) {
			t.Fatalf("prompt transport changed: %q, %v", input, err)
		}
		if cmd.Stderr != io.Discard || cmd.WaitDelay != 3*time.Second || cmd.Cancel == nil {
			t.Fatal("process supervision configuration changed")
		}
	}
}

func TestInvalidSandboxDoesNotLaunchOrEmitEvents(t *testing.T) {
	a := Adapter{Executable: filepath.Join(t.TempDir(), "does-not-exist"), Sandbox: "danger-full-access"}
	called := false
	result, err := a.Run(context.Background(), t.TempDir(), "unused", func(events.Record) error { called = true; return nil })
	if err == nil || err.Error() != "unsupported explicit sandbox override" || called || result.ExitCode != 1 {
		t.Fatalf("invalid sandbox reached execution: %+v, %v, sink=%v", result, err, called)
	}
}
