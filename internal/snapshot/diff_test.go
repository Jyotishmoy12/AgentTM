package snapshot

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestModesDiffBoundsAndEmptyFiles(t *testing.T) {
	e, id := setup(t)
	write(t, e.Root, "run.sh", []byte("echo hi\n"))
	write(t, e.Root, "empty", nil)
	a := capture(t, e, id, "baseline").Manifest
	if runtime.GOOS != "windows" {
		if err := os.Chmod(filepath.Join(e.Root, "run.sh"), 0700); err != nil {
			t.Fatal(err)
		}
		b := capture(t, e, id, "manual").Manifest
		d, err := e.Diff(b.ID)
		if err != nil || len(d) != 1 || d[0].OldMode == d[0].NewMode || d[0].Patch != "" {
			t.Fatalf("mode diff %+v %v", d, err)
		}
	}
	write(t, e.Root, "empty", []byte("no final newline"))
	write(t, e.Root, "large", bytes.Repeat([]byte("x"), 200000))
	b := capture(t, e, id, "manual").Manifest
	d, err := e.Diff(b.ID)
	if err != nil {
		t.Fatal(err)
	}
	for _, v := range d {
		if v.Path == "empty" && !strings.Contains(v.Patch, "No newline at end of file") {
			t.Fatal("newline marker missing")
		}
		if v.Path == "large" && !v.Truncated {
			t.Fatal("large patch not bounded")
		}
	}
	content, err := e.File(a.ID, "empty")
	if err != nil || len(content) != 0 {
		t.Fatal("empty object not preserved")
	}
	if !json.Valid(mustJSON(t, b)) {
		t.Fatal("invalid manifest encoding")
	}
}
