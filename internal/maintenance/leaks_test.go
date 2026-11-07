package maintenance

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"go.uber.org/goleak"
)

func TestMain(m *testing.M) {
	goleak.VerifyTestMain(m)
}

func TestMaintenanceSourceFilesStayWithinLineLimit(t *testing.T) {
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
			t.Errorf("%s has %d lines; the maintenance package limit is 200", file, lines)
		}
	}
}
