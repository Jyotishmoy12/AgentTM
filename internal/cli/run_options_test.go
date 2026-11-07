package cli

import (
	"io"
	"strings"
	"testing"
)

func TestRunOptionsPreserveDefaultsAndOverrides(t *testing.T) {
	for _, scan := range []bool{false, true} {
		options, err := parseRunOptions([]string{"run", "codex", "--", "quoted task"}, scan, io.Discard)
		if err != nil || options.task != "quoted task" || options.scanTools != scan || options.model != "" || options.sandbox != "" {
			t.Fatalf("defaults changed: %+v, %v", options, err)
		}
	}
	options, err := parseRunOptions([]string{"run", "codex", "--model", "selected-model", "--sandbox", "workspace-write", "--snapshot-after-tool=false", "--", "-task"}, true, io.Discard)
	if err != nil || options.model != "selected-model" || options.sandbox != "workspace-write" || options.task != "-task" || options.scanTools {
		t.Fatalf("explicit options changed: %+v, %v", options, err)
	}
}

func TestRunOptionsRejectInvalidArguments(t *testing.T) {
	for _, args := range [][]string{
		{"run"}, {"run", "other"}, {"run", "codex"},
		{"run", "codex", "--", ""}, {"run", "codex", "--", "  "},
		{"run", "codex", "--", "one", "two"},
		{"run", "codex", "--sandbox", "unsafe", "--", "task"},
		{"run", "codex", "--unknown", "task"},
		{"run", "codex", "--", strings.Repeat("x", (1<<20)+1)},
	} {
		if _, err := parseRunOptions(args, true, io.Discard); err == nil {
			t.Errorf("invalid run arguments accepted: %q", args[:min(2, len(args))])
		}
	}
}
