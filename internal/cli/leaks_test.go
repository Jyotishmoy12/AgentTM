package cli

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"go.uber.org/goleak"
)

func TestMain(m *testing.M) {
	if os.Getenv("AGENTTM_CLI_TEST_CHILD") == "1" {
		runCLIChild()
		os.Exit(0)
	}
	goleak.VerifyTestMain(m)
}

func TestCLISourceFilesStayWithinLineLimit(t *testing.T) {
	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatal(err)
	}
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		if lines := strings.Count(strings.TrimSuffix(string(data), "\n"), "\n") + 1; lines > 200 {
			t.Errorf("%s has %d lines; the CLI package limit is 200", file, lines)
		}
	}
}
