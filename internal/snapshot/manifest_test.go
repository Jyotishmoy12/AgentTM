package snapshot

import (
	"context"
	"testing"

	"agenttm/internal/storage"
)

func TestPathAndManifestValidation(t *testing.T) {
	for _, p := range []string{"../outside", "/absolute", "C:/escape", "a\\b", "a/../b", ".git/config", ".agenttm/config.json", "a/CON.txt", "a/trailing.", "a/trailing ", "a\x00b", "a:b"} {
		if ValidatePath(p) == nil {
			t.Errorf("accepted %q", p)
		}
	}
	if err := ValidatePath("src/日本語.go"); err != nil {
		t.Fatal(err)
	}
	e, id := setup(t)
	write(t, e.Root, "src/a", []byte("a"))
	m := capture(t, e, id, "baseline").Manifest
	original := m.Files[0]
	m.Files = append(m.Files, File{Path: "src/A", ObjectID: original.ObjectID, Size: 1, Mode: 0600})
	if m.Validate() == nil {
		t.Fatal("case collision accepted")
	}
	if _, err := e.Load("../../outside"); err == nil {
		t.Fatal("manifest traversal accepted")
	}
	if _, err := e.File(storage.ID(), "src/a"); err == nil {
		t.Fatal("unknown checkpoint accepted")
	}
	if _, err := e.File(m.ID, "../outside"); err == nil {
		t.Fatal("file traversal accepted")
	}
	if _, err := e.Capture(context.Background(), storage.ID(), "manual"); err == nil {
		t.Fatal("foreign session accepted")
	}
}
