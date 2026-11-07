package codex

import (
	"os"
	"testing"

	"go.uber.org/goleak"
)

func TestMain(m *testing.M) {
	if os.Getenv("AGENTTM_TEST_CHILD") == "1" {
		runCodexFixture()
		os.Exit(0)
	}
	goleak.VerifyTestMain(m)
}
