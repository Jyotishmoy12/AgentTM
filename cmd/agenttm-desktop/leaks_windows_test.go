//go:build windows

package main

import (
	"os"
	"testing"

	"go.uber.org/goleak"
)

func TestMain(m *testing.M) {
	if os.Getenv("AGENTTM_DESKTOP_TEST_CODEX") == "1" {
		runDesktopCodexFixture()
		os.Exit(0)
	}
	goleak.VerifyTestMain(m)
}
