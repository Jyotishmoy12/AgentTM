package desktop

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

func TestDesktopFilesStayWithinLineLimit(t *testing.T) {
	files, err := filepath.Glob("*")
	if err != nil {
		t.Fatal(err)
	}
	for _, file := range files {
		switch filepath.Ext(file) {
		case ".go", ".html", ".css", ".js":
		default:
			continue
		}
		data, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		if lines := strings.Count(strings.TrimSuffix(string(data), "\n"), "\n") + 1; lines > 200 {
			t.Errorf("%s has %d lines; the desktop folder limit is 200", file, lines)
		}
	}
}
