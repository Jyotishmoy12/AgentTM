package codex

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAvailabilityHandlesUnsupportedAndPrivateDiagnostics(t *testing.T) {
	t.Setenv("AGENTTM_TEST_CHILD", "1")
	a := Adapter{Executable: os.Args[0]}
	for _, mode := range []string{"version-fails", "no-json", "help-fails", "version-secret"} {
		t.Run(mode, func(t *testing.T) {
			t.Setenv("AGENTTM_TEST_CODEX_MODE", mode)
			version, err := a.Available(context.Background())
			if mode == "version-secret" {
				if err != nil || strings.Contains(version, "private-test-token") || !strings.Contains(version, "[REDACTED]") {
					t.Fatalf("version redaction changed: %q, %v", version, err)
				}
				return
			}
			if err == nil || strings.Contains(err.Error(), "private configuration") {
				t.Fatalf("unsafe or missing availability error: %v", err)
			}
			if mode == "version-fails" && version != "" {
				t.Fatalf("failed version command returned output: %q", version)
			}
			if mode != "version-fails" && !strings.Contains(err.Error(), "exec --json") {
				t.Fatalf("unsupported JSON mode lost its guidance: %v", err)
			}
		})
	}
}

func TestMissingExecutableRemainsActionable(t *testing.T) {
	a := Adapter{Executable: filepath.Join(t.TempDir(), "absent-codex")}
	if version, err := a.Available(context.Background()); err == nil || version != "" || !strings.Contains(err.Error(), "PATH") {
		t.Fatalf("missing executable guidance changed: %q, %v", version, err)
	}
	if result, err := a.Run(context.Background(), t.TempDir(), "unused", nil); err == nil || result.ExitCode != 1 || !strings.Contains(err.Error(), "could not start Codex") {
		t.Fatalf("start failure changed: %+v, %v", result, err)
	}
}
